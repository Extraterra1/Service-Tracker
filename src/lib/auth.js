import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider, hasFirebaseConfig } from './firebase'

export async function configureAuthPersistence() {
  if (!auth) {
    return
  }

  await setPersistence(auth, browserLocalPersistence)
}

export function subscribeToAuthChanges(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  if (!auth || !hasFirebaseConfig) {
    throw new Error('Firebase environment variables are missing.')
  }

  googleProvider.setCustomParameters({ prompt: 'select_account' })
  return signInWithPopup(auth, googleProvider)
}

export async function signOutUser() {
  if (!auth) {
    return
  }

  await signOut(auth)
}

export async function checkAllowlist(uid) {
  if (!db || !uid) {
    return { allowed: false, reason: 'missing' }
  }

  const allowlistDoc = await getDoc(doc(db, 'staff_allowlist', uid))
  if (!allowlistDoc.exists()) {
    return { allowed: false, reason: 'not_found' }
  }

  const payload = allowlistDoc.data()
  if (payload.active !== true) {
    return { allowed: false, reason: 'inactive' }
  }

  return { allowed: true, reason: 'ok', profile: payload }
}
