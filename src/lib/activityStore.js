import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebaseDb'

function normalizeActivityEntry(value, id) {
  return {
    id,
    actionType: value?.actionType ?? 'status_toggle',
    date: value?.date ?? '',
    itemId: value?.itemId ?? '',
    serviceType: value?.serviceType ?? '',
    done: value?.done === true,
    createdAt: value?.createdAt ?? null,
    updatedByUid: value?.updatedByUid ?? '',
    updatedByName: value?.updatedByName ?? '',
    updatedByEmail: value?.updatedByEmail ?? '',
    itemName: value?.itemName ?? '',
    itemTime: value?.itemTime ?? '',
    reservationId: value?.reservationId ?? '',
    oldTime: value?.oldTime ?? '',
    newTime: value?.newTime ?? '',
  }
}

export function subscribeToDateActivity(date, callback, errorCallback) {
  if (!db || !date) {
    callback([])
    return () => {}
  }

  const entriesRef = collection(db, 'service_activity', date, 'entries')
  const q = query(entriesRef, orderBy('createdAt', 'desc'), limit(300))

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((entry) => normalizeActivityEntry(entry.data(), entry.id))
      callback(entries)
    },
    (error) => {
      if (typeof errorCallback === 'function') {
        errorCallback(error)
      }
    },
  )
}
