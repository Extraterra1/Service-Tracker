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
  Timestamp: {
    fromDate: vi.fn((date) => ({ __type: 'timestamp', date })),
  },
  serverTimestamp: () => serverTimestampMock(),
  where: vi.fn(),
  writeBatch: (...args) => writeBatchMock(...args),
}))

vi.mock('../firebaseDb', () => ({
  db: { __name: 'mock-db' },
}))

import { setItemDoneState } from '../statusStore'

describe('statusStore', () => {
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

  it('writes the plate into status activity entries', async () => {
    const batchSetMock = vi.fn()
    const batchCommitMock = vi.fn().mockResolvedValue(undefined)
    writeBatchMock.mockReturnValue({
      set: batchSetMock,
      commit: batchCommitMock,
    })

    await setItemDoneState({
      date: '2026-03-07',
      item: {
        itemId: 'item-1',
        id: 'reservation-1',
        name: 'Servico 1',
        plate: 'AA-00-AA',
        serviceType: 'delivery',
        time: '09:00',
      },
      done: true,
      user: {
        uid: 'user-1',
        email: 'maria@example.com',
        displayName: 'Maria Silva',
      },
    })

    expect(batchSetMock).toHaveBeenCalledTimes(2)

    const [, activityPayload] = batchSetMock.mock.calls[1]
    expect(activityPayload).toMatchObject({
      actionType: 'status_toggle',
      itemId: 'item-1',
      reservationId: 'reservation-1',
      plate: 'AA-00-AA',
    })
    expect(batchCommitMock).toHaveBeenCalledTimes(1)
  })

  it('rejects writes for non-current service dates before touching Firestore', async () => {
    writeBatchMock.mockReturnValue({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })

    await expect(
      setItemDoneState({
        date: '2026-03-06',
        item: {
          itemId: 'item-1',
          serviceType: 'pickup',
        },
        done: true,
        user: {
          uid: 'user-1',
        },
      }),
    ).rejects.toThrow('Só é possível alterar o dia atual.')

    expect(writeBatchMock).not.toHaveBeenCalled()
  })

  it('resets transfer state in the same batch when a recolha is undone', async () => {
    const set = vi.fn()
    const commit = vi.fn().mockResolvedValue(undefined)
    writeBatchMock.mockReturnValue({ set, commit })

    await setItemDoneState({
      date: '2026-03-07',
      item: { itemId: 'return-1', serviceType: 'return', plate: 'AA-00-AA', name: 'Cliente', time: '10:00' },
      done: false,
      user: { uid: 'user-1', displayName: 'Maria Silva', email: 'maria@example.com' },
    })

    expect(docMock).toHaveBeenCalledWith({ __name: 'mock-db' }, 'service_transfer', '2026-03-07_return-1')
    expect(set).toHaveBeenCalledTimes(3)
    expect(set.mock.calls[1][1]).toMatchObject({
      date: '2026-03-07', itemId: 'return-1', serviceType: 'return', plate: 'AA-00-AA', transferred: false,
    })
    expect(set.mock.calls[2][1]).toMatchObject({ actionType: 'status_toggle', done: false })
  })
})
