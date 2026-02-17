import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'

function getUserSettingsDoc(uid) {
  return doc(db, 'user_settings', uid)
}

export function subscribeToUserPin(uid, callback, errorCallback) {
  if (!db || !uid) {
    callback('')
    return () => {}
  }

  return onSnapshot(
    getUserSettingsDoc(uid),
    (snapshot) => {
      const payload = snapshot.data()
      const apiPin = typeof payload?.apiPin === 'string' ? payload.apiPin : ''
      callback(apiPin)
    },
    (error) => {
      if (typeof errorCallback === 'function') {
        errorCallback(error)
      }
    },
  )
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
