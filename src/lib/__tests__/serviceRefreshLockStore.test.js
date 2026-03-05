import { beforeEach, describe, expect, it, vi } from 'vitest'

const docMock = vi.fn()
const runTransactionMock = vi.fn()
const serverTimestampMock = vi.fn(() => ({ __type: 'serverTimestamp' }))
const timestampFromMillisMock = vi.fn((ms) => ({
  __type: 'timestamp',
  __ms: ms,
  seconds: Math.floor(ms / 1000),
  toMillis: () => ms,
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args) => docMock(...args),
  runTransaction: (...args) => runTransactionMock(...args),
  serverTimestamp: () => serverTimestampMock(),
  Timestamp: {
    fromMillis: (ms) => timestampFromMillisMock(ms),
  },
}))

vi.mock('../firebaseDb', () => ({
  db: { __name: 'mock-db' },
}))

import { AUTO_REFRESH_LEASE_MS, tryAcquireAutoRefreshLease } from '../serviceRefreshLockStore'

describe('serviceRefreshLockStore', () => {
  beforeEach(() => {
    docMock.mockReset()
    runTransactionMock.mockReset()
    serverTimestampMock.mockClear()
    timestampFromMillisMock.mockClear()

    docMock.mockImplementation((_db, collectionName, docId) => ({ collectionName, docId }))
  })

  it('uses a 45-second lease by default', () => {
    expect(AUTO_REFRESH_LEASE_MS).toBe(45 * 1000)
  })

  it('acquires a lock when no unexpired lease exists', async () => {
    const txSetMock = vi.fn()
    runTransactionMock.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => false }),
        set: txSetMock,
      }),
    )

    const result = await tryAcquireAutoRefreshLease({
      date: '2026-03-05',
      userUid: 'uid-1',
      cacheVersion: 'v1',
      nowMs: 1_700_000,
    })

    expect(result).toEqual({ acquired: true, reason: 'lease_acquired' })
    expect(txSetMock).toHaveBeenCalledTimes(1)

    const [lockRef, payload, options] = txSetMock.mock.calls[0]
    expect(lockRef).toEqual({ collectionName: 'service_refresh_locks', docId: '2026-03-05' })
    expect(payload).toMatchObject({
      date: '2026-03-05',
      ownerUid: 'uid-1',
      cacheVersion: 'v1',
    })
    expect(payload.leaseUntil.toMillis()).toBe(1_700_000 + AUTO_REFRESH_LEASE_MS)
    expect(payload.updatedAt).toEqual({ __type: 'serverTimestamp' })
    expect(options).toEqual({ merge: true })
  })

  it('does not acquire lock when another unexpired lease exists', async () => {
    const txSetMock = vi.fn()
    runTransactionMock.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            leaseUntil: {
              seconds: 2_000,
            },
          }),
        }),
        set: txSetMock,
      }),
    )

    const result = await tryAcquireAutoRefreshLease({
      date: '2026-03-05',
      userUid: 'uid-2',
      cacheVersion: 'v1',
      nowMs: 1_700_000,
    })

    expect(result).toEqual({ acquired: false, reason: 'locked' })
    expect(txSetMock).not.toHaveBeenCalled()
  })

  it('re-acquires lock when existing lease is expired', async () => {
    const txSetMock = vi.fn()
    runTransactionMock.mockImplementation(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            leaseUntil: {
              seconds: 1_699,
            },
          }),
        }),
        set: txSetMock,
      }),
    )

    const result = await tryAcquireAutoRefreshLease({
      date: '2026-03-05',
      userUid: 'uid-3',
      cacheVersion: 'v2',
      nowMs: 1_700_000,
    })

    expect(result).toEqual({ acquired: true, reason: 'lease_acquired' })
    expect(txSetMock).toHaveBeenCalledTimes(1)
  })

  it('fails open when the lock transaction check fails', async () => {
    runTransactionMock.mockRejectedValue(new Error('firestore unavailable'))

    const result = await tryAcquireAutoRefreshLease({
      date: '2026-03-05',
      userUid: 'uid-4',
      cacheVersion: 'v2',
      nowMs: 1_700_000,
    })

    expect(result).toEqual({ acquired: true, reason: 'lock_check_failed' })
  })
})
