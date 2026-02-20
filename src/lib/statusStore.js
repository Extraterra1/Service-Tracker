import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

// Add a safety margin so the UI moves items immediately even if the local clock snapshot is up to ~1 minute stale.
const FORCE_COMPLETED_OFFSET_MS = 65 * 60 * 1000

function getUpdaterFirstName(user) {
  const displayName = String(user?.displayName ?? '').trim()
  if (displayName) {
    return displayName.split(/\s+/)[0]
  }

  const email = String(user?.email ?? '').trim()
  if (email) {
    const localPart = email.split('@')[0] ?? ''
    const emailName = localPart.split(/[._-]+/)[0]
    if (emailName) {
      return emailName
    }
  }

  return 'Unknown'
}

export function subscribeToDateStatus(date, callback, errorCallback) {
  if (!db || !date) {
    callback({})
    return () => {}
  }

  const q = query(collection(db, 'service_status'), where('date', '==', date))

  return onSnapshot(
    q,
    (snapshot) => {
      const map = {}
      snapshot.forEach((entry) => {
        const value = entry.data()
        if (value.itemId) {
          map[value.itemId] = {
            done: value.done === true,
            updatedAt: value.updatedAt ?? null,
            updatedByName: value.updatedByName ?? '',
            updatedByEmail: value.updatedByEmail ?? '',
          }
        }
      })
      callback(map)
    },
    (error) => {
      if (typeof errorCallback === 'function') {
        errorCallback(error)
      }
    },
  )
}

export async function setItemDoneState({ date, item, done, user, forceCompletedNow = false }) {
  if (!db) {
    throw new Error('Firestore is not configured.')
  }

  if (!item?.itemId) {
    throw new Error('Cannot update item without itemId.')
  }

  const docId = `${date}_${item.itemId}`
  const updatedAt = forceCompletedNow
    ? Timestamp.fromDate(new Date(Date.now() - FORCE_COMPLETED_OFFSET_MS))
    : serverTimestamp()

  await setDoc(
    doc(db, 'service_status', docId),
    {
      date,
      itemId: item.itemId,
      serviceType: item.serviceType,
      done,
      updatedAt,
      updatedByUid: user?.uid ?? '',
      updatedByName: getUpdaterFirstName(user),
      updatedByEmail: user?.email ?? '',
    },
    { merge: true },
  )
}
