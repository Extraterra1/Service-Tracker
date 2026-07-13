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

import {
  FLIGHT_CACHE_MAX_AGE_MS,
  getFlightStatusMemoryCache,
  isFlightStatusCacheFresh,
  saveFlightStatusCache,
  subscribeToFlightStatusDay,
  tryAcquireFlightStatusRefreshLease,
} from '../flightStatusStore'

describe('flightStatusStore', () => {
  beforeEach(() => {
    docMock.mockClear()
    onSnapshotMock.mockReset()
    setDocMock.mockReset()
    runTransactionMock.mockReset()
    serverTimestampMock.mockClear()
  })

  it('treats a matching cache as fresh for five minutes', () => {
    expect(FLIGHT_CACHE_MAX_AGE_MS).toBe(5 * 60 * 1000)
    const now = new Date('2026-07-13T10:05:00.000Z')
    const cache = { cachedAt: new Date('2026-07-13T10:00:00.000Z'), flightNumbers: ['U27654', 'TP1685'] }
    expect(isFlightStatusCacheFresh(cache, [' TP 1685 ', 'U2 7654'], now)).toBe(true)
    expect(isFlightStatusCacheFresh(cache, ['TP1685'], now)).toBe(false)
    expect(isFlightStatusCacheFresh(cache, cache.flightNumbers, new Date(now.getTime() + 1))).toBe(false)
  })

  it('subscribes to one shared day document and reports normalized cache data', () => {
    const onData = vi.fn()
    const readSnapshotData = vi.fn(() => ({ flightNumbers: [' TP 1685 '], results: [{ flightNumber: ' TP 1685 ' }], cachedAt: '2026-07-13T10:00:00Z' }))
    onSnapshotMock.mockImplementation((_ref, next) => {
      next({ exists: () => true, data: readSnapshotData })
      return vi.fn()
    })
    subscribeToFlightStatusDay('2026-07-13', onData)
    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'flight_status_cache', '2026-07-13')
    expect(readSnapshotData).toHaveBeenCalledWith({ serverTimestamps: 'estimate' })
    expect(onData).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-07-13',
      flightNumbers: ['TP1685'],
      results: [{ flightNumber: 'TP1685' }],
    }))
  })

  it('persists shared current-day results with server cache metadata', async () => {
    await saveFlightStatusCache({
      date: '2026-07-13',
      flightNumbers: ['TP1685'],
      results: [{ flightNumber: 'TP1685', status: 'scheduled' }],
      userUid: 'uid-1',
    })
    expect(setDocMock).toHaveBeenCalledWith(
      { collectionName: 'flight_status_cache', docId: '2026-07-13' },
      {
        date: '2026-07-13',
        flightNumbers: ['TP1685'],
        results: [{ flightNumber: 'TP1685', status: 'scheduled' }],
        source: 'fr24-unofficial',
        cachedAt: { __type: 'serverTimestamp' },
        updatedByUid: 'uid-1',
      },
    )
    expect(getFlightStatusMemoryCache('2026-07-13')).toEqual(expect.objectContaining({
      flightNumbers: ['TP1685'],
      results: [{ flightNumber: 'TP1685', status: 'scheduled' }],
    }))
  })

  it('uses a transaction lease so only one client refreshes stale shared data', async () => {
    const transactionSet = vi.fn()
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: vi.fn().mockResolvedValue({ exists: () => false }),
      set: transactionSet,
    }))
    await expect(tryAcquireFlightStatusRefreshLease({ date: '2026-07-13', userUid: 'uid-1', cacheVersion: 'old', nowMs: 1000 })).resolves.toEqual({ acquired: true, reason: 'lease_acquired' })
    expect(transactionSet).toHaveBeenCalledWith(
      { collectionName: 'flight_status_refresh_locks', docId: '2026-07-13' },
      expect.objectContaining({ date: '2026-07-13', ownerUid: 'uid-1', cacheVersion: 'old' }),
      { merge: true },
    )
  })

  it('declines an automatic refresh while another lease is active', async () => {
    runTransactionMock.mockImplementation((_db, callback) => callback({
      get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ leaseUntil: { seconds: 2 } }) }),
      set: vi.fn(),
    }))
    await expect(tryAcquireFlightStatusRefreshLease({ date: '2026-07-13', userUid: 'uid-2', cacheVersion: 'old', nowMs: 1000 })).resolves.toEqual({ acquired: false, reason: 'locked' })
  })
})
