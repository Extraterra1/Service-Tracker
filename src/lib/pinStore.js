import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebaseDb'

function getUserSettingsDoc(uid) {
  return doc(db, 'user_settings', uid)
}

export async function readUserPin(uid) {
  if (!db || !uid) {
    return ''
  }

  const snapshot = await getDoc(getUserSettingsDoc(uid))
  const payload = snapshot.data()

  return typeof payload?.apiPin === 'string' ? payload.apiPin : ''
}

export async function saveUserPin(uid, pin) {
  if (!db || !uid) {
    return
  }

  await setDoc(
    getUserSettingsDoc(uid),
    {
      apiPin: pin,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
