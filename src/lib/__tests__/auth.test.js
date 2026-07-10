import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  auth: { currentUser: null },
  googleProvider: { setCustomParameters: vi.fn() },
  onAuthStateChanged: vi.fn(),
  onIdTokenChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../firebaseAuth', () => ({
  auth: authMocks.auth,
  googleProvider: authMocks.googleProvider,
}))

vi.mock('../firebaseApp', () => ({
  hasFirebaseConfig: true,
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: authMocks.onAuthStateChanged,
  onIdTokenChanged: authMocks.onIdTokenChanged,
  signInWithPopup: authMocks.signInWithPopup,
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
  signOut: authMocks.signOut,
}))

describe('local auth bypass configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.auth.currentUser = null
  })

  it('returns trimmed credentials only for an explicitly enabled development environment', async () => {
    const { getLocalAuthBypassCredentials } = await import('../auth')

    expect(getLocalAuthBypassCredentials({
      isDev: true,
      env: {
        VITE_LOCAL_AUTH_BYPASS: 'true',
        VITE_LOCAL_AUTH_EMAIL: ' debug@example.com ',
        VITE_LOCAL_AUTH_PASSWORD: ' local-password ',
      },
    })).toEqual({
      email: 'debug@example.com',
      password: 'local-password',
    })
  })

  it.each([
    { isDev: false, env: { VITE_LOCAL_AUTH_BYPASS: 'true', VITE_LOCAL_AUTH_EMAIL: 'debug@example.com', VITE_LOCAL_AUTH_PASSWORD: 'secret' } },
    { isDev: true, env: { VITE_LOCAL_AUTH_BYPASS: 'false', VITE_LOCAL_AUTH_EMAIL: 'debug@example.com', VITE_LOCAL_AUTH_PASSWORD: 'secret' } },
    { isDev: true, env: { VITE_LOCAL_AUTH_BYPASS: 'true', VITE_LOCAL_AUTH_EMAIL: '', VITE_LOCAL_AUTH_PASSWORD: 'secret' } },
    { isDev: true, env: { VITE_LOCAL_AUTH_BYPASS: 'true', VITE_LOCAL_AUTH_EMAIL: 'debug@example.com', VITE_LOCAL_AUTH_PASSWORD: '  ' } },
  ])('returns null for disabled or incomplete configuration', async (options) => {
    const { getLocalAuthBypassCredentials } = await import('../auth')

    expect(getLocalAuthBypassCredentials(options)).toBeNull()
  })
})
