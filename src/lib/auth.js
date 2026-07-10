import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, googleProvider } from './firebaseAuth'
import { hasFirebaseConfig } from './firebaseApp'

export function getLocalAuthBypassCredentials({ isDev, env }) {
  if (!isDev || env?.VITE_LOCAL_AUTH_BYPASS !== 'true') {
    return null
  }

  const email = String(env?.VITE_LOCAL_AUTH_EMAIL ?? '').trim()
  const password = String(env?.VITE_LOCAL_AUTH_PASSWORD ?? '').trim()

  if (!email || !password) {
    return null
  }

  return { email, password }
}

export function subscribeToAuthChanges(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export function subscribeToIdTokenChanges(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onIdTokenChanged(auth, callback)
}

export async function waitForAuthStateReady() {
  if (!auth) {
    return
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady()
    return
  }

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe()
      resolve()
    })
  })
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
