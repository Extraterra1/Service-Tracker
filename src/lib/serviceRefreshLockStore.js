import { Timestamp, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebaseDb'
import { toTimestampMs } from './timestamp'

export const AUTO_REFRESH_LEASE_MS = 45 * 1000

function resolveNowMs(nowMs) {
  return Number.isFinite(nowMs) ? nowMs : Date.now()
}

export async function tryAcquireAutoRefreshLease({
  date,
  userUid,
  cacheVersion,
  nowMs,
  leaseMs = AUTO_REFRESH_LEASE_MS,
}) {
  if (!db || !date) {
    return { acquired: true, reason: 'lock_check_skipped' }
  }

  const now = resolveNowMs(nowMs)
  const lockRef = doc(db, 'service_refresh_locks', date)

  try {
    const acquired = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(lockRef)
      if (snapshot.exists()) {
        const lockData = snapshot.data() ?? {}
        const leaseUntilMs = toTimestampMs(lockData.leaseUntil, 0)
        if (leaseUntilMs > now) {
          return false
        }
      }

      transaction.set(
        lockRef,
        {
          date,
          ownerUid: String(userUid ?? 'unknown'),
          cacheVersion: String(cacheVersion ?? 'unknown'),
          leaseUntil: Timestamp.fromMillis(now + leaseMs),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      return true
    })

    return acquired ? { acquired: true, reason: 'lease_acquired' } : { acquired: false, reason: 'locked' }
  } catch (error) {
    console.warn('Auto-refresh lock check failed. Continuing without lock.', error)
    return { acquired: true, reason: 'lock_check_failed' }
  }
}
