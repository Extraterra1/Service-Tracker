import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

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

export async function setItemDoneState({ date, item, done, user }) {
  if (!db) {
    throw new Error('Firestore is not configured.')
  }

  if (!item?.itemId) {
    throw new Error('Cannot update item without itemId.')
  }

  const docId = `${date}_${item.itemId}`
  await setDoc(
    doc(db, 'service_status', docId),
    {
      date,
      itemId: item.itemId,
      serviceType: item.serviceType,
      done,
      updatedAt: serverTimestamp(),
      updatedByUid: user?.uid ?? '',
      updatedByName: user?.displayName ?? user?.email ?? 'Unknown user',
      updatedByEmail: user?.email ?? '',
    },
    { merge: true },
  )
}
