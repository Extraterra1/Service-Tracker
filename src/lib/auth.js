import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from './firebaseAuth'
import { hasFirebaseConfig } from './firebaseApp'

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
