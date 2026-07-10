import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const gateMocks = vi.hoisted(() => ({
  subscribeToAuthChanges: vi.fn(() => vi.fn()),
  subscribeToIdTokenChanges: vi.fn(() => vi.fn()),
  waitForAuthStateReady: vi.fn(),
  signInWithLocalDebugAccount: vi.fn(),
  recordAuthState: vi.fn(),
  recordIdTokenChange: vi.fn(),
  recordIdTokenTiming: vi.fn(),
  recordError: vi.fn(),
}))

vi.mock('../../lib/auth', () => ({
  subscribeToAuthChanges: gateMocks.subscribeToAuthChanges,
  subscribeToIdTokenChanges: gateMocks.subscribeToIdTokenChanges,
  waitForAuthStateReady: gateMocks.waitForAuthStateReady,
  signInWithLocalDebugAccount: gateMocks.signInWithLocalDebugAccount,
}))

vi.mock('../../lib/firebaseApp', () => ({
  hasFirebaseConfig: true,
}))

vi.mock('../../lib/sessionDiagnostics', () => ({
  sessionDiagnostics: {
    recordAuthState: gateMocks.recordAuthState,
    recordIdTokenChange: gateMocks.recordIdTokenChange,
    recordIdTokenTiming: gateMocks.recordIdTokenTiming,
    recordError: gateMocks.recordError,
  },
}))

import { useAccessGate } from '../useAccessGate'

describe('useAccessGate local authentication startup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    gateMocks.subscribeToAuthChanges.mockReturnValue(vi.fn())
    gateMocks.subscribeToIdTokenChanges.mockReturnValue(vi.fn())
    gateMocks.waitForAuthStateReady.mockResolvedValue(undefined)
    gateMocks.signInWithLocalDebugAccount.mockResolvedValue(null)
  })

  it('attempts local debug authentication after Firebase restores its session', async () => {
    renderHook(() => useAccessGate())

    await waitFor(() => {
      expect(gateMocks.signInWithLocalDebugAccount).toHaveBeenCalledTimes(1)
    })
    expect(gateMocks.waitForAuthStateReady).toHaveBeenCalledTimes(1)
    expect(gateMocks.waitForAuthStateReady.mock.invocationCallOrder[0]).toBeLessThan(
      gateMocks.signInWithLocalDebugAccount.mock.invocationCallOrder[0],
    )
  })

  it('records a non-sensitive diagnostic when local debug authentication fails', async () => {
    const error = new Error('invalid debug credentials')
    gateMocks.signInWithLocalDebugAccount.mockRejectedValue(error)

    renderHook(() => useAccessGate())

    await waitFor(() => {
      expect(gateMocks.recordError).toHaveBeenCalledWith('local_auth_bypass_error', error)
    })
    expect(gateMocks.subscribeToAuthChanges).toHaveBeenCalledTimes(1)
  })
})
