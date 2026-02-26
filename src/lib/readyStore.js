import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebaseDb'

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

export function subscribeToDateReady(date, callback, errorCallback) {
  if (!db || !date) {
    callback([])
    return () => {}
  }

  const q = query(collection(db, 'service_ready'), where('date', '==', date))

  return onSnapshot(
    q,
    (snapshot) => {
      const changes = snapshot.docChanges().map((entry) => {
        const value = entry.doc.data() ?? {}
        return {
          changeType: entry.type,
          itemId: value.itemId ?? '',
          ready: {
            ready: value.ready === true,
            plate: value.plate ?? '',
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

export async function setItemReadyState({ date, item, ready, user }) {
  if (!db) {
    throw new Error('Firestore is not configured.')
  }

  if (!date) {
    throw new Error('Date is required.')
  }

  if (!item?.itemId) {
    throw new Error('Cannot update ready state without itemId.')
  }

  if (item.serviceType !== 'pickup') {
    throw new Error('Ready state is only available for deliveries.')
  }

  const plate = String(item.plate ?? '').trim()
  if (!plate) {
    throw new Error('Cannot mark ready without license plate.')
  }

  const updaterName = getUpdaterFirstName(user)
  const updaterEmail = user?.email ?? ''
  const updaterUid = user?.uid ?? ''

  const readyRef = doc(db, 'service_ready', `${date}_${item.itemId}`)
  const activityRef = doc(collection(db, 'service_activity', date, 'entries'))
  const batch = writeBatch(db)

  batch.set(
    readyRef,
    {
      date,
      itemId: item.itemId,
      serviceType: item.serviceType,
      plate,
      ready: ready === true,
      updatedAt: serverTimestamp(),
      updatedByUid: updaterUid,
      updatedByName: updaterName,
      updatedByEmail: updaterEmail,
    },
    { merge: true },
  )

  batch.set(activityRef, {
    actionType: 'ready_toggle',
    date,
    itemId: item.itemId,
    serviceType: item.serviceType ?? '',
    done: false,
    ready: ready === true,
    plate,
    createdAt: serverTimestamp(),
    updatedByUid: updaterUid,
    updatedByName: updaterName,
    updatedByEmail: updaterEmail,
    itemName: item.name ?? '',
    itemTime: item.overrideTime ?? item.displayTime ?? item.time ?? '',
    reservationId: item.id ?? '',
  })

  await batch.commit()
}
