import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const accessRequestStoreMocks = vi.hoisted(() => ({
  subscribeToPendingAccessRequests: vi.fn(),
  approveAccessRequest: vi.fn(),
  denyAccessRequest: vi.fn(),
}))

vi.mock('../../lib/accessRequestStore', () => ({
  subscribeToPendingAccessRequests: (...args) => accessRequestStoreMocks.subscribeToPendingAccessRequests(...args),
  approveAccessRequest: (...args) => accessRequestStoreMocks.approveAccessRequest(...args),
  denyAccessRequest: (...args) => accessRequestStoreMocks.denyAccessRequest(...args),
}))

describe('useAccessRequests', () => {
  beforeEach(() => {
    accessRequestStoreMocks.subscribeToPendingAccessRequests.mockReset()
    accessRequestStoreMocks.approveAccessRequest.mockReset()
    accessRequestStoreMocks.denyAccessRequest.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not subscribe until the current user is allowed', async () => {
    const { useAccessRequests } = await import('../useAccessRequests')

    const { result } = renderHook(() =>
      useAccessRequests({
        accessState: 'pending',
        user: null,
      })
    )

    expect(accessRequestStoreMocks.subscribeToPendingAccessRequests).not.toHaveBeenCalled()
    expect(result.current.pendingAccessRequests).toEqual([])
  })

  it('subscribes to pending access requests for allowed staff and cleans up', async () => {
    const unsubscribe = vi.fn()
    accessRequestStoreMocks.subscribeToPendingAccessRequests.mockImplementation((next) => {
      next([{ uid: 'uid-1', displayName: 'New User', email: 'new@example.com' }])
      return unsubscribe
    })

    const { useAccessRequests } = await import('../useAccessRequests')

    const { result, unmount } = renderHook(() =>
      useAccessRequests({
        accessState: 'allowed',
        user: { uid: 'staff-1' },
      })
    )

    expect(accessRequestStoreMocks.subscribeToPendingAccessRequests).toHaveBeenCalledTimes(1)
    expect(result.current.pendingAccessRequests).toEqual([
      { uid: 'uid-1', displayName: 'New User', email: 'new@example.com' },
    ])

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('approves and denies requests with a per-request busy marker', async () => {
    let resolveApprove
    accessRequestStoreMocks.approveAccessRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApprove = resolve
        })
    )
    accessRequestStoreMocks.denyAccessRequest.mockResolvedValue(undefined)

    const staffUser = { uid: 'staff-1', email: 'staff@example.com' }
    const request = { uid: 'uid-1', email: 'new@example.com' }
    const { useAccessRequests } = await import('../useAccessRequests')

    const { result } = renderHook(() =>
      useAccessRequests({
        accessState: 'allowed',
        user: staffUser,
      })
    )

    await act(async () => {
      void result.current.approveAccessRequest(request)
      await Promise.resolve()
    })

    expect(result.current.accessRequestDecisionUid).toBe('uid-1')
    expect(accessRequestStoreMocks.approveAccessRequest).toHaveBeenCalledWith({
      request,
      user: staffUser,
    })

    await act(async () => {
      resolveApprove()
      await Promise.resolve()
    })

    expect(result.current.accessRequestDecisionUid).toBe('')

    await act(async () => {
      await result.current.denyAccessRequest(request)
    })

    expect(accessRequestStoreMocks.denyAccessRequest).toHaveBeenCalledWith({
      request,
      user: staffUser,
    })
  })
})
