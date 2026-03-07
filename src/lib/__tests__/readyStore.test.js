import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const collectionMock = vi.fn()
const docMock = vi.fn()
const serverTimestampMock = vi.fn(() => ({ __type: 'serverTimestamp' }))
const writeBatchMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args) => collectionMock(...args),
  doc: (...args) => docMock(...args),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: () => serverTimestampMock(),
  where: vi.fn(),
  writeBatch: (...args) => writeBatchMock(...args),
}))

vi.mock('../firebaseDb', () => ({
  db: { __name: 'mock-db' },
}))

import { setItemReadyState } from '../readyStore'

describe('readyStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'))

    collectionMock.mockReset()
    docMock.mockReset()
    serverTimestampMock.mockClear()
    writeBatchMock.mockReset()

    collectionMock.mockImplementation((_db, collectionName, date, subcollectionName) => ({
      collectionName,
      date,
      subcollectionName,
    }))

    docMock.mockImplementation((...args) => ({ __type: 'doc', args }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects ready-state writes for non-current service dates before touching Firestore', async () => {
    writeBatchMock.mockReturnValue({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })

    await expect(
      setItemReadyState({
        date: '2026-03-06',
        item: {
          itemId: 'item-1',
          serviceType: 'pickup',
          plate: 'AA-00-AA',
        },
        ready: true,
        user: {
          uid: 'user-1',
        },
      }),
    ).rejects.toThrow('Só é possível alterar o dia atual.')

    expect(writeBatchMock).not.toHaveBeenCalled()
  })
})
