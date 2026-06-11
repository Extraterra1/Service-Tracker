import { beforeEach, describe, expect, it, vi } from 'vitest'

const accessMocks = vi.hoisted(() => ({
  db: { name: 'firestore-db' },
  doc: vi.fn((db, collection, id) => ({ db, collection, id })),
  getDoc: vi.fn(),
  createOwnAccessRequest: vi.fn(),
  allowlistPayload: null,
  requestPayload: null,
}))

function createSnapshot(payload) {
  return {
    exists: () => Boolean(payload),
    data: () => payload,
  }
}

vi.mock('../firebaseDb', () => ({
  db: accessMocks.db,
}))

vi.mock('../accessRequestStore', () => ({
  createOwnAccessRequest: (...args) => accessMocks.createOwnAccessRequest(...args),
}))

vi.mock('firebase/firestore', () => ({
  doc: accessMocks.doc,
  getDoc: accessMocks.getDoc,
}))

describe('access approval resolution', () => {
  beforeEach(() => {
    vi.resetModules()
    accessMocks.allowlistPayload = null
    accessMocks.requestPayload = null
    accessMocks.doc.mockClear()
    accessMocks.getDoc.mockReset()
    accessMocks.createOwnAccessRequest.mockReset()

    accessMocks.getDoc.mockImplementation(async (ref) => {
      if (ref.collection === 'staff_allowlist') {
        return createSnapshot(accessMocks.allowlistPayload)
      }

      if (ref.collection === 'access_requests') {
        return createSnapshot(accessMocks.requestPayload)
      }

      return createSnapshot(null)
    })

    accessMocks.createOwnAccessRequest.mockResolvedValue({
      state: 'pending',
      requestStatus: 'pending',
      message: 'Pedido de acesso enviado. Aguarda aprovação.',
    })
  })

  it('creates a Firestore access request when a signed-in user is not allowlisted yet', async () => {
    const user = { uid: 'uid-1', email: 'new@example.com', displayName: 'New User' }
    const { resolveAccessState } = await import('../access')

    const result = await resolveAccessState(user)

    expect(accessMocks.createOwnAccessRequest).toHaveBeenCalledWith(user)
    expect(result).toEqual({
      state: 'pending',
      reason: 'request_pending',
      message: 'Pedido de acesso enviado. Aguarda aprovação.',
    })
  })

  it('keeps a pending user waiting when their Firestore request already exists', async () => {
    accessMocks.requestPayload = {
      status: 'pending',
      requestCount: 1,
    }

    const { resolveAccessState } = await import('../access')

    const result = await resolveAccessState({ uid: 'uid-1' })

    expect(accessMocks.createOwnAccessRequest).not.toHaveBeenCalled()
    expect(result).toEqual({
      state: 'pending',
      reason: 'request_pending',
      message: 'Pedido de acesso enviado. Aguarda aprovação.',
    })
  })

  it('lets an explicit pending retry recreate the request if the request doc is missing', async () => {
    const user = { uid: 'uid-1', email: 'new@example.com', displayName: 'New User' }
    const { pollApprovalState } = await import('../access')

    const result = await pollApprovalState(user)

    expect(accessMocks.createOwnAccessRequest).toHaveBeenCalledWith(user)
    expect(result).toEqual({
      state: 'pending',
      reason: 'request_pending',
      message: 'Pedido de acesso enviado. Aguarda aprovação.',
    })
  })

  it('allows access once the allowlist is active', async () => {
    accessMocks.allowlistPayload = {
      active: true,
      role: 'staff',
      displayName: 'Staff User',
    }

    const { resolveAccessState } = await import('../access')

    const result = await resolveAccessState({ uid: 'staff-1' })

    expect(accessMocks.createOwnAccessRequest).not.toHaveBeenCalled()
    expect(result).toEqual({
      state: 'allowed',
      reason: 'allowlist',
      message: '',
      profile: accessMocks.allowlistPayload,
    })
  })
})
