import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebaseDb';
import { CURRENT_DAY_ONLY_MUTATION_ERROR, isCurrentServiceDate } from './date';
import { isTransferServiceLocation } from './serviceLocations';

function getUpdaterFirstName(user) {
  const displayName = String(user?.displayName ?? '').trim();
  if (displayName) return displayName.split(/\s+/)[0];
  const emailName = String(user?.email ?? '').trim().split('@')[0]?.split(/[._-]+/)[0];
  return emailName || 'Unknown';
}

export function subscribeToDateTransfers(date, callback, errorCallback) {
  if (!db || !date) {
    callback([]);
    return () => {};
  }

  const transferQuery = query(collection(db, 'service_transfer'), where('date', '==', date));
  return onSnapshot(
    transferQuery,
    (snapshot) => callback(snapshot.docChanges().map((entry) => {
      const value = entry.doc.data() ?? {};
      return {
        changeType: entry.type,
        itemId: value.itemId ?? '',
        transfer: {
          transferred: value.transferred === true,
          plate: value.plate ?? '',
          updatedAt: value.updatedAt ?? null,
          updatedByUid: value.updatedByUid ?? '',
          updatedByName: value.updatedByName ?? '',
          updatedByEmail: value.updatedByEmail ?? ''
        }
      };
    })),
    (error) => errorCallback?.(error)
  );
}

export async function setItemTransferredState({ date, item, transferred, user }) {
  if (!db) throw new Error('Firestore is not configured.');
  if (!date) throw new Error('Date is required.');
  if (!isCurrentServiceDate(date)) throw new Error(CURRENT_DAY_ONLY_MUTATION_ERROR);
  if (!item?.itemId) throw new Error('Cannot update transfer state without itemId.');
  if (item.serviceType !== 'return') throw new Error('Transfer state is only available for returns.');
  if (!isTransferServiceLocation(item.location)) throw new Error('Transfer state is only available for airport or office returns.');

  const plate = String(item.plate ?? '').trim();
  if (!plate) throw new Error('Cannot update transfer state without license plate.');

  const updatedByUid = user?.uid ?? '';
  const updatedByName = getUpdaterFirstName(user);
  const updatedByEmail = user?.email ?? '';
  const transferRef = doc(db, 'service_transfer', `${date}_${item.itemId}`);
  const activityRef = doc(collection(db, 'service_activity', date, 'entries'));
  const batch = writeBatch(db);

  batch.set(transferRef, {
    date,
    itemId: item.itemId,
    serviceType: item.serviceType,
    plate,
    transferred: transferred === true,
    updatedAt: serverTimestamp(),
    updatedByUid,
    updatedByName,
    updatedByEmail
  }, { merge: true });

  batch.set(activityRef, {
    actionType: 'transfer_toggle',
    date,
    itemId: item.itemId,
    serviceType: item.serviceType,
    done: false,
    transferred: transferred === true,
    plate,
    createdAt: serverTimestamp(),
    updatedByUid,
    updatedByName,
    updatedByEmail,
    itemName: item.name ?? '',
    itemTime: item.overrideTime ?? item.displayTime ?? item.time ?? '',
    reservationId: item.id ?? ''
  });

  await batch.commit();
}
