import { beforeEach, describe, expect, it, vi } from 'vitest'

const firebaseAuthMocks = vi.hoisted(() => {
  const app = { name: 'service-tracker-app' }
  const authInstance = { name: 'firebase-auth-instance' }
  const indexedDBLocalPersistence = { name: 'indexeddb-local-persistence' }
  const browserLocalPersistence = { name: 'browser-local-persistence' }
  const browserSessionPersistence = { name: 'browser-session-persistence' }
  const browserPopupRedirectResolver = { name: 'browser-popup-redirect-resolver' }

  return {
    app,
    authInstance,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    browserPopupRedirectResolver,
    initializeAuth: vi.fn(() => authInstance),
    GoogleAuthProvider: vi.fn(function GoogleAuthProvider() {
      this.provider = 'google'
    })
  }
})

vi.mock('../firebaseApp', () => ({
  app: firebaseAuthMocks.app
}))

vi.mock('firebase/auth', () => ({
  initializeAuth: firebaseAuthMocks.initializeAuth,
  indexedDBLocalPersistence: firebaseAuthMocks.indexedDBLocalPersistence,
  browserLocalPersistence: firebaseAuthMocks.browserLocalPersistence,
  browserSessionPersistence: firebaseAuthMocks.browserSessionPersistence,
  browserPopupRedirectResolver: firebaseAuthMocks.browserPopupRedirectResolver,
  GoogleAuthProvider: firebaseAuthMocks.GoogleAuthProvider
}))

describe('firebaseAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    firebaseAuthMocks.initializeAuth.mockClear()
    firebaseAuthMocks.GoogleAuthProvider.mockClear()
  })

  it('initializes Firebase Auth with IndexedDB-first persistence and popup resolver', async () => {
    const { auth, googleProvider } = await import('../firebaseAuth')

    expect(firebaseAuthMocks.initializeAuth).toHaveBeenCalledWith(firebaseAuthMocks.app, {
      persistence: [
        firebaseAuthMocks.indexedDBLocalPersistence,
        firebaseAuthMocks.browserLocalPersistence,
        firebaseAuthMocks.browserSessionPersistence
      ],
      popupRedirectResolver: firebaseAuthMocks.browserPopupRedirectResolver
    })
    expect(auth).toBe(firebaseAuthMocks.authInstance)
    expect(googleProvider).toEqual({ provider: 'google' })
  })
})
