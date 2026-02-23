import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore'
import { db } from './firebaseDb'

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
    callback([])
    return () => {}
  }

  const q = query(collection(db, 'service_status'), where('date', '==', date))

  return onSnapshot(
    q,
    (snapshot) => {
      const changes = snapshot.docChanges().map((entry) => {
        const value = entry.doc.data()
        return {
          changeType: entry.type,
          itemId: value.itemId ?? '',
          status: {
            done: value.done === true,
            updatedAt: value.updatedAt ?? null,
            updatedByName: value.updatedByName ?? '',
            updatedByEmail: value.updatedByEmail ?? '',
          },
        }
      })
      callback(changes)
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
  const updaterName = getUpdaterFirstName(user)
  const updaterEmail = user?.email ?? ''
  const updaterUid = user?.uid ?? ''

  const statusRef = doc(db, 'service_status', docId)
  const activityRef = doc(collection(db, 'service_activity', date, 'entries'))
  const batch = writeBatch(db)

  batch.set(
    statusRef,
    {
      date,
      itemId: item.itemId,
      serviceType: item.serviceType,
      done,
      updatedAt,
      updatedByUid: updaterUid,
      updatedByName: updaterName,
      updatedByEmail: updaterEmail,
    },
    { merge: true },
  )

  batch.set(activityRef, {
    date,
    itemId: item.itemId,
    serviceType: item.serviceType ?? '',
    done,
    createdAt: serverTimestamp(),
    updatedByUid: updaterUid,
    updatedByName: updaterName,
    updatedByEmail: updaterEmail,
    itemName: item.name ?? '',
    itemTime: item.time ?? '',
    reservationId: item.id ?? '',
  })

  await batch.commit()
}
