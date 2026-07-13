import { Timestamp, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { normalizeFlightNumber } from '../features/flights/flightNumbers'
import { db } from './firebaseDb'
import { toTimestampMs } from './timestamp'

export const FLIGHT_CACHE_MAX_AGE_MS = 5 * 60 * 1000
export const FLIGHT_REFRESH_LEASE_MS = 45 * 1000

const flightStatusMemoryCache = new Map()

function normalizeFlightSet(values = []) {
  return [...new Set(values.map(normalizeFlightNumber).filter(Boolean))].sort()
}

function normalizeResults(results = []) {
  return results
    .filter((result) => result && typeof result === 'object')
    .map((result) => ({ ...result, flightNumber: normalizeFlightNumber(result.flightNumber) }))
    .filter((result) => result.flightNumber)
}

function rememberFlightStatusCache({ date, cachedAt, flightNumbers, results }) {
  if (!date) return null
  const cache = {
    date,
    cachedAt: cachedAt ?? new Date(),
    flightNumbers: normalizeFlightSet(flightNumbers),
    results: normalizeResults(results),
  }
  flightStatusMemoryCache.set(date, cache)
  return cache
}

export function getFlightStatusMemoryCache(date) {
  return flightStatusMemoryCache.get(date) ?? null
}

export function isFlightStatusCacheFresh(cache, flightNumbers, now = new Date(), maxAgeMs = FLIGHT_CACHE_MAX_AGE_MS) {
  if (!cache) return false
  const cachedAtMs = toTimestampMs(cache.cachedAt, Number.NaN)
  if (!Number.isFinite(cachedAtMs) || now.getTime() - cachedAtMs > maxAgeMs) return false
  const cachedFlights = normalizeFlightSet(cache.flightNumbers)
  const requestedFlights = normalizeFlightSet(flightNumbers)
  return cachedFlights.length === requestedFlights.length && cachedFlights.every((flight, index) => flight === requestedFlights[index])
}

export function subscribeToFlightStatusDay(date, onData, onMissing, onError) {
  if (!db || !date) {
    onMissing?.()
    return () => {}
  }
  return onSnapshot(
    doc(db, 'flight_status_cache', date),
    (snapshot) => {
      if (!snapshot.exists()) {
        onMissing?.()
        return
      }
      const payload = snapshot.data({ serverTimestamps: 'estimate' }) ?? {}
      const cache = rememberFlightStatusCache({
        date,
        cachedAt: payload.cachedAt ?? null,
        flightNumbers: normalizeFlightSet(payload.flightNumbers),
        results: normalizeResults(payload.results),
      })
      onData?.(cache)
    },
    (error) => onError?.(error),
  )
}

export async function saveFlightStatusCache({ date, flightNumbers, results, userUid }) {
  if (!db || !date) return false
  rememberFlightStatusCache({ date, cachedAt: new Date(), flightNumbers, results })
  await setDoc(doc(db, 'flight_status_cache', date), {
    date,
    flightNumbers: normalizeFlightSet(flightNumbers),
    results: normalizeResults(results),
    source: 'fr24-unofficial',
    cachedAt: serverTimestamp(),
    updatedByUid: String(userUid ?? 'unknown'),
  })
  return true
}

export async function tryAcquireFlightStatusRefreshLease({ date, userUid, cacheVersion, nowMs = Date.now() }) {
  if (!db || !date) return { acquired: true, reason: 'lock_check_skipped' }
  const lockRef = doc(db, 'flight_status_refresh_locks', date)
  try {
    const acquired = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(lockRef)
      if (snapshot.exists() && toTimestampMs(snapshot.data()?.leaseUntil, 0) > nowMs) return false
      transaction.set(lockRef, {
        date,
        ownerUid: String(userUid ?? 'unknown'),
        cacheVersion: String(cacheVersion ?? 'missing'),
        leaseUntil: Timestamp.fromMillis(nowMs + FLIGHT_REFRESH_LEASE_MS),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      return true
    })
    return acquired ? { acquired: true, reason: 'lease_acquired' } : { acquired: false, reason: 'locked' }
  } catch (error) {
    console.warn('Flight refresh lock check failed. Continuing without lock.', error)
    return { acquired: true, reason: 'lock_check_failed' }
  }
}
