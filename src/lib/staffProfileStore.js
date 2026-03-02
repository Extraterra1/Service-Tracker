import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebaseDb';

function getFirstName(user) {
  const displayName = String(user?.displayName ?? '').trim();
  if (displayName) {
    return displayName.split(/\s+/)[0];
  }

  const email = String(user?.email ?? '').trim();
  if (email) {
    const localPart = email.split('@')[0] ?? '';
    const emailName = localPart.split(/[._-]+/)[0];
    if (emailName) {
      return emailName;
    }
  }

  return '';
}

export async function upsertOwnStaffProfile(user) {
  if (!db) {
    return;
  }

  const uid = String(user?.uid ?? '').trim();
  if (!uid) {
    return;
  }

  const displayName = String(user?.displayName ?? '').trim();
  const email = String(user?.email ?? '').trim();
  const photoURL = String(user?.photoURL ?? '').trim();
  const firstName = getFirstName(user);

  await setDoc(
    doc(db, 'staff_profiles', uid),
    {
      uid,
      displayName,
      firstName,
      email,
      photoURL,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
