import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  db: { __name: 'mock-db' },
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })),
  setDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}))

vi.mock('../firebaseDb', () => ({
  db: firestoreMocks.db,
}))

vi.mock('firebase/firestore', () => ({
  collection: (...args) => firestoreMocks.collection(...args),
  doc: (...args) => firestoreMocks.doc(...args),
  getDoc: (...args) => firestoreMocks.getDoc(...args),
  onSnapshot: (...args) => firestoreMocks.onSnapshot(...args),
  query: (...args) => firestoreMocks.query(...args),
  serverTimestamp: () => firestoreMocks.serverTimestamp(),
  setDoc: (...args) => firestoreMocks.setDoc(...args),
  where: (...args) => firestoreMocks.where(...args),
  writeBatch: (...args) => firestoreMocks.writeBatch(...args),
}))

function createSnapshot(payload) {
  return {
    exists: () => Boolean(payload),
    data: () => payload,
  }
}

function createRequestDoc(id, payload) {
  return {
    id,
    data: () => payload,
  }
}

describe('accessRequestStore', () => {
  beforeEach(() => {
    firestoreMocks.collection.mockReset()
    firestoreMocks.doc.mockReset()
    firestoreMocks.getDoc.mockReset()
    firestoreMocks.onSnapshot.mockReset()
    firestoreMocks.query.mockReset()
    firestoreMocks.serverTimestamp.mockClear()
    firestoreMocks.setDoc.mockReset()
    firestoreMocks.where.mockReset()
    firestoreMocks.writeBatch.mockReset()

    firestoreMocks.collection.mockImplementation((_db, collectionName) => ({ collectionName }))
    firestoreMocks.doc.mockImplementation((_db, collectionName, id) => ({ collectionName, id }))
    firestoreMocks.where.mockImplementation((field, operator, value) => ({ field, operator, value }))
    firestoreMocks.query.mockImplementation((collectionRef, ...constraints) => ({ collectionRef, constraints }))
  })

  it('creates a safe pending request for the signed-in user', async () => {
    firestoreMocks.getDoc.mockResolvedValue(createSnapshot(null))
    firestoreMocks.setDoc.mockResolvedValue(undefined)

    const { createOwnAccessRequest } = await import('../accessRequestStore')

    const result = await createOwnAccessRequest({
      uid: 'uid-1',
      email: 'NEW.USER@Example.COM ',
      displayName: 'New User',
      photoURL: 'https://example.com/avatar.png',
    })

    expect(firestoreMocks.doc).toHaveBeenCalledWith(firestoreMocks.db, 'access_requests', 'uid-1')
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      { collectionName: 'access_requests', id: 'uid-1' },
      expect.objectContaining({
        uid: 'uid-1',
        email: 'NEW.USER@Example.COM',
        emailNormalized: 'new.user@example.com',
        displayName: 'New User',
        photoURL: 'https://example.com/avatar.png',
        status: 'pending',
        requestCount: 1,
        decisionType: '',
        decisionByUid: '',
      })
    )
    expect(result).toEqual({
      state: 'pending',
      requestStatus: 'pending',
      message: 'Pedido de acesso enviado. Aguarda aprovação.',
    })
  })

  it('subscribes to pending requests and sorts the oldest request first', async () => {
    const unsubscribe = vi.fn()
    firestoreMocks.onSnapshot.mockImplementation((_queryRef, next) => {
      next({
        docs: [
          createRequestDoc('newer', {
            uid: 'newer',
            email: 'newer@example.com',
            displayName: 'Newer',
            status: 'pending',
            requestCount: 1,
            createdAt: { seconds: 2 },
          }),
          createRequestDoc('older', {
            uid: 'older',
            email: 'older@example.com',
            displayName: 'Older',
            status: 'pending',
            requestCount: 2,
            createdAt: { seconds: 1 },
          }),
        ],
      })
      return unsubscribe
    })

    const { subscribeToPendingAccessRequests } = await import('../accessRequestStore')
    const callback = vi.fn()

    const result = subscribeToPendingAccessRequests(callback)

    expect(firestoreMocks.collection).toHaveBeenCalledWith(firestoreMocks.db, 'access_requests')
    expect(firestoreMocks.where).toHaveBeenCalledWith('status', '==', 'pending')
    expect(callback).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'older', displayName: 'Older', requestCount: 2 }),
      expect.objectContaining({ uid: 'newer', displayName: 'Newer', requestCount: 1 }),
    ])
    expect(result).toBe(unsubscribe)
  })

  it('approves an access request by writing allowlist and request decision docs in one batch', async () => {
    const batchSet = vi.fn()
    const batchCommit = vi.fn().mockResolvedValue(undefined)
    firestoreMocks.writeBatch.mockReturnValue({
      set: batchSet,
      commit: batchCommit,
    })

    const { approveAccessRequest } = await import('../accessRequestStore')

    await approveAccessRequest({
      request: {
        uid: 'uid-2',
        email: 'user@example.com',
        emailNormalized: 'user@example.com',
        displayName: 'User Two',
        photoURL: '',
        requestCount: 3,
        createdAt: { toMillis: () => 1000 },
        lastRequestedAt: { toMillis: () => 2000 },
      },
      user: {
        uid: 'staff-1',
        email: 'staff@example.com',
        displayName: 'Staff One',
      },
    })

    expect(firestoreMocks.writeBatch).toHaveBeenCalledWith(firestoreMocks.db)
    expect(batchSet).toHaveBeenCalledWith(
      { collectionName: 'staff_allowlist', id: 'uid-2' },
      expect.objectContaining({
        uid: 'uid-2',
        active: true,
        role: 'staff',
        email: 'user@example.com',
        displayName: 'User Two',
        approvedByUid: 'staff-1',
      })
    )
    expect(batchSet).toHaveBeenCalledWith(
      { collectionName: 'access_requests', id: 'uid-2' },
      expect.objectContaining({
        uid: 'uid-2',
        status: 'approved',
        decisionType: 'approve',
        decisionByUid: 'staff-1',
      })
    )
    expect(batchCommit).toHaveBeenCalledTimes(1)
  })

  it('denies an access request by writing only the request decision doc', async () => {
    const batchSet = vi.fn()
    const batchCommit = vi.fn().mockResolvedValue(undefined)
    firestoreMocks.writeBatch.mockReturnValue({
      set: batchSet,
      commit: batchCommit,
    })

    const { denyAccessRequest } = await import('../accessRequestStore')

    await denyAccessRequest({
      request: {
        uid: 'uid-3',
        email: 'denied@example.com',
        emailNormalized: 'denied@example.com',
        displayName: 'Denied User',
        photoURL: '',
        requestCount: 1,
      },
      user: {
        uid: 'staff-1',
        email: 'staff@example.com',
        displayName: 'Staff One',
      },
    })

    expect(batchSet).toHaveBeenCalledTimes(1)
    expect(batchSet).toHaveBeenCalledWith(
      { collectionName: 'access_requests', id: 'uid-3' },
      expect.objectContaining({
        uid: 'uid-3',
        status: 'denied',
        decisionType: 'deny',
        decisionByUid: 'staff-1',
      })
    )
    expect(batchCommit).toHaveBeenCalledTimes(1)
  })
})
