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

function normalizeTimeInput(value) {
  const normalized = String(value ?? '').trim()
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) {
    throw new Error('Hora inválida. Usa o formato HH:mm.')
  }

  return `${match[1]}:${match[2]}`
}

export function subscribeToDateTimeOverrides(date, callback, errorCallback) {
  if (!db || !date) {
    callback([])
    return () => {}
  }

  const q = query(collection(db, 'service_time_overrides'), where('date', '==', date))

  return onSnapshot(
    q,
    (snapshot) => {
      const changes = snapshot.docChanges().map((entry) => {
        const value = entry.doc.data() ?? {}
        return {
          changeType: entry.type,
          itemId: value.itemId ?? '',
          override: {
            date: value.date ?? date,
            itemId: value.itemId ?? '',
            serviceType: value.serviceType ?? '',
            originalTime: value.originalTime ?? '',
            overrideTime: value.overrideTime ?? '',
            updatedAt: value.updatedAt ?? null,
            updatedByUid: value.updatedByUid ?? '',
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

export async function setItemTimeOverride({ date, item, newTime, user }) {
  if (!db) {
    throw new Error('Firestore is not configured.')
  }

  if (!date) {
    throw new Error('Date is required.')
  }

  if (!item?.itemId) {
    throw new Error('Cannot update item without itemId.')
  }

  const overrideTime = normalizeTimeInput(newTime)
  const previousTime = String(item.overrideTime ?? item.displayTime ?? item.time ?? '').trim()
  const originalTime = String(item.time ?? '').trim()
  if (overrideTime === (previousTime || originalTime)) {
    return overrideTime
  }
  const updaterName = getUpdaterFirstName(user)
  const updaterEmail = user?.email ?? ''
  const updaterUid = user?.uid ?? ''

  const overrideRef = doc(db, 'service_time_overrides', `${date}_${item.itemId}`)
  const activityRef = doc(collection(db, 'service_activity', date, 'entries'))
  const batch = writeBatch(db)

  batch.set(
    overrideRef,
    {
      date,
      itemId: item.itemId,
      serviceType: item.serviceType ?? '',
      originalTime,
      overrideTime,
      updatedAt: serverTimestamp(),
      updatedByUid: updaterUid,
      updatedByName: updaterName,
      updatedByEmail: updaterEmail,
    },
    { merge: true },
  )

  batch.set(activityRef, {
    actionType: 'time_change',
    date,
    itemId: item.itemId,
    serviceType: item.serviceType ?? '',
    done: false,
    createdAt: serverTimestamp(),
    updatedByUid: updaterUid,
    updatedByName: updaterName,
    updatedByEmail: updaterEmail,
    itemName: item.name ?? '',
    itemTime: overrideTime,
    reservationId: item.id ?? '',
    oldTime: previousTime || originalTime,
    newTime: overrideTime,
  })

  await batch.commit()
  return overrideTime
}
