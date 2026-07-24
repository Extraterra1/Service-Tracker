import { beforeEach, describe, expect, it, vi } from 'vitest'

const docMock = vi.fn((_db, collectionName, docId) => ({ collectionName, docId }))
const onSnapshotMock = vi.fn()
const setDocMock = vi.fn()
const runTransactionMock = vi.fn()
const serverTimestampMock = vi.fn(() => ({ __type: 'serverTimestamp' }))

vi.mock('firebase/firestore', () => ({
  doc: (...args) => docMock(...args),
  onSnapshot: (...args) => onSnapshotMock(...args),
  setDoc: (...args) => setDocMock(...args),
  runTransaction: (...args) => runTransactionMock(...args),
  serverTimestamp: () => serverTimestampMock(),
  Timestamp: { fromMillis: (ms) => ({ seconds: Math.floor(ms / 1000), toMillis: () => ms }) },
}))

vi.mock('../firebaseDb', () => ({ db: { name: 'mock-db' } }))

let store = {}
try {
  store = await import('../futureFlightCacheStore')
} catch {
  // The first TDD run intentionally happens before the store exists.
}

describe('futureFlightCacheStore', () => {
  beforeEach(() => {
    docMock.mockClear()
    onSnapshotMock.mockReset()
    setDocMock.mockReset()
    runTransactionMock.mockReset()
    serverTimestampMock.mockClear()
  })

  it('treats an exact normalized flight set as fresh for 24 hours', () => {
    expect(store.FUTURE_FLIGHT_CACHE_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000)
    const cachedAt = new Date('2026-07-24T10:00:00.000Z')
    const cache = { cachedAt, flightNumbers: ['U27654', 'TP1685'] }
    expect(store.doesFutureFlightCacheMatch(cache, [' TP 1685 ', 'U2 7654'])).toBe(true)
    expect(store.doesFutureFlightCacheMatch(cache, ['TP1685'])).toBe(false)
    expect(store.isFutureFlightCacheFresh(cache, [' TP 1685 ', 'U2 7654'], new Date('2026-07-25T10:00:00.000Z'))).toBe(true)
    expect(store.isFutureFlightCacheFresh(cache, ['TP1685'], new Date('2026-07-24T11:00:00.000Z'))).toBe(false)
    expect(store.isFutureFlightCacheFresh(cache, cache.flightNumbers, new Date('2026-07-25T10:00:00.001Z'))).toBe(false)
  })

  it('subscribes to a normalized shared future-flight day document', () => {
    const onData = vi.fn()
    const readData = vi.fn(() => ({
      flightNumbers: [' TP 1685 '],
      results: [{ flightNumber: ' TP 1685 ', status: 'scheduled' }],
      cachedAt: '2026-07-24T10:00:00Z',
    }))
    onSnapshotMock.mockImplementation((_ref, next) => {
      next({ exists: () => true, data: readData })
      return vi.fn()
    })

    store.subscribeToFutureFlightDay('2026-07-25', onData)

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'future_flight_cache', '2026-07-25')
    expect(onData).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-07-25',
      flightNumbers: ['TP1685'],
      results: [{ flightNumber: 'TP1685', status: 'scheduled' }],
    }))
    expect(store.getFutureFlightMemoryCache('2026-07-25')).toEqual(expect.objectContaining({ flightNumbers: ['TP1685'] }))
  })

  it('persists normalized results with future-flight cache metadata', async () => {
    await store.saveFutureFlightCache({
      date: '2026-07-25',
      flightNumbers: [' TP 1685 '],
      results: [{ flightNumber: ' TP 1685 ', status: 'scheduled' }],
      userUid: 'uid-1',
    })

    expect(setDocMock).toHaveBeenCalledWith(
      { collectionName: 'future_flight_cache', docId: '2026-07-25' },
      {
        date: '2026-07-25',
        flightNumbers: ['TP1685'],
        results: [{ flightNumber: 'TP1685', status: 'scheduled' }],
        source: 'flightview-future',
        cachedAt: { __type: 'serverTimestamp' },
        updatedByUid: 'uid-1',
      },
    )
  })

  it('uses a transaction lease to deduplicate automatic future refreshes', async () => {
    const transactionSet = vi.fn()
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: vi.fn().mockResolvedValue({ exists: () => false }),
      set: transactionSet,
    }))

    await expect(store.tryAcquireFutureFlightRefreshLease({
      date: '2026-07-25',
      userUid: 'uid-1',
      cacheVersion: 'missing',
      nowMs: 1000,
    })).resolves.toEqual({ acquired: true, reason: 'lease_acquired' })
    expect(transactionSet).toHaveBeenCalledWith(
      { collectionName: 'future_flight_refresh_locks', docId: '2026-07-25' },
      expect.objectContaining({ date: '2026-07-25', ownerUid: 'uid-1', cacheVersion: 'missing' }),
      { merge: true },
    )
  })
})
