import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const accessRequestStoreMocks = vi.hoisted(() => ({
  subscribeToPendingAccessRequests: vi.fn(),
  subscribeToManagedAccessUsers: vi.fn(),
  approveAccessRequest: vi.fn(),
  denyAccessRequest: vi.fn(),
  revokeAccessUser: vi.fn(),
}))

vi.mock('../../lib/accessRequestStore', () => ({
  subscribeToPendingAccessRequests: (...args) => accessRequestStoreMocks.subscribeToPendingAccessRequests(...args),
  subscribeToManagedAccessUsers: (...args) => accessRequestStoreMocks.subscribeToManagedAccessUsers(...args),
  approveAccessRequest: (...args) => accessRequestStoreMocks.approveAccessRequest(...args),
  denyAccessRequest: (...args) => accessRequestStoreMocks.denyAccessRequest(...args),
  revokeAccessUser: (...args) => accessRequestStoreMocks.revokeAccessUser(...args),
}))

describe('useAccessRequests', () => {
  beforeEach(() => {
    accessRequestStoreMocks.subscribeToPendingAccessRequests.mockReset()
    accessRequestStoreMocks.subscribeToManagedAccessUsers.mockReset()
    accessRequestStoreMocks.approveAccessRequest.mockReset()
    accessRequestStoreMocks.denyAccessRequest.mockReset()
    accessRequestStoreMocks.revokeAccessUser.mockReset()
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
        canManageAccess: false,
      })
    )

    expect(accessRequestStoreMocks.subscribeToPendingAccessRequests).not.toHaveBeenCalled()
    expect(accessRequestStoreMocks.subscribeToManagedAccessUsers).not.toHaveBeenCalled()
    expect(result.current.pendingAccessRequests).toEqual([])
    expect(result.current.managedAccessUsers).toEqual([])
  })

  it('does not subscribe for allowed non-admin staff', async () => {
    const { useAccessRequests } = await import('../useAccessRequests')

    renderHook(() =>
      useAccessRequests({
        accessState: 'allowed',
        user: { uid: 'staff-1' },
        canManageAccess: false,
      })
    )

    expect(accessRequestStoreMocks.subscribeToPendingAccessRequests).not.toHaveBeenCalled()
    expect(accessRequestStoreMocks.subscribeToManagedAccessUsers).not.toHaveBeenCalled()
  })

  it('subscribes to pending requests and managed users for allowed admins and cleans up', async () => {
    const unsubscribePending = vi.fn()
    const unsubscribeUsers = vi.fn()
    accessRequestStoreMocks.subscribeToPendingAccessRequests.mockImplementation((next) => {
      next([{ uid: 'uid-1', displayName: 'New User', email: 'new@example.com' }])
      return unsubscribePending
    })
    accessRequestStoreMocks.subscribeToManagedAccessUsers.mockImplementation((next) => {
      next([{ uid: 'staff-2', displayName: 'Staff Two', email: 'staff2@example.com', active: true }])
      return unsubscribeUsers
    })

    const { useAccessRequests } = await import('../useAccessRequests')

    const { result, unmount } = renderHook(() =>
      useAccessRequests({
        accessState: 'allowed',
        user: { uid: 'staff-1' },
        canManageAccess: true,
      })
    )

    expect(accessRequestStoreMocks.subscribeToPendingAccessRequests).toHaveBeenCalledTimes(1)
    expect(accessRequestStoreMocks.subscribeToManagedAccessUsers).toHaveBeenCalledTimes(1)
    expect(result.current.pendingAccessRequests).toEqual([
      { uid: 'uid-1', displayName: 'New User', email: 'new@example.com' },
    ])
    expect(result.current.managedAccessUsers).toEqual([
      { uid: 'staff-2', displayName: 'Staff Two', email: 'staff2@example.com', active: true },
    ])

    unmount()

    expect(unsubscribePending).toHaveBeenCalledTimes(1)
    expect(unsubscribeUsers).toHaveBeenCalledTimes(1)
  })

  it('approves, denies, and revokes users with a per-user busy marker', async () => {
    let resolveApprove
    accessRequestStoreMocks.approveAccessRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApprove = resolve
        })
    )
    accessRequestStoreMocks.denyAccessRequest.mockResolvedValue(undefined)
    accessRequestStoreMocks.revokeAccessUser.mockResolvedValue(undefined)

    const staffUser = { uid: 'staff-1', email: 'staff@example.com' }
    const request = { uid: 'uid-1', email: 'new@example.com' }
    const target = { uid: 'uid-2', email: 'staff2@example.com' }
    const { useAccessRequests } = await import('../useAccessRequests')

    const { result } = renderHook(() =>
      useAccessRequests({
        accessState: 'allowed',
        user: staffUser,
        canManageAccess: true,
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

    await act(async () => {
      await result.current.revokeAccessUser(target)
    })

    expect(accessRequestStoreMocks.revokeAccessUser).toHaveBeenCalledWith({
      target,
      user: staffUser,
    })
  })

  it('does not run access decisions for non-admin staff', async () => {
    const { useAccessRequests } = await import('../useAccessRequests')

    const { result } = renderHook(() =>
      useAccessRequests({
        accessState: 'allowed',
        user: { uid: 'staff-1' },
        canManageAccess: false,
      })
    )

    await act(async () => {
      await result.current.approveAccessRequest({ uid: 'uid-1' })
      await result.current.denyAccessRequest({ uid: 'uid-1' })
      await result.current.revokeAccessUser({ uid: 'uid-1' })
    })

    expect(accessRequestStoreMocks.approveAccessRequest).not.toHaveBeenCalled()
    expect(accessRequestStoreMocks.denyAccessRequest).not.toHaveBeenCalled()
    expect(accessRequestStoreMocks.revokeAccessUser).not.toHaveBeenCalled()
  })
})
