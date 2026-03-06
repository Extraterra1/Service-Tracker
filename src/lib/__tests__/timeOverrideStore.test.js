import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { setItemTimeOverride } from '../timeOverrideStore'

describe('timeOverrideStore', () => {
  beforeEach(() => {
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

  it('writes the plate into time change activity entries', async () => {
    const batchSetMock = vi.fn()
    const batchCommitMock = vi.fn().mockResolvedValue(undefined)
    writeBatchMock.mockReturnValue({
      set: batchSetMock,
      commit: batchCommitMock,
    })

    await setItemTimeOverride({
      date: '2026-03-06',
      item: {
        itemId: 'item-1',
        id: 'reservation-1',
        name: 'Servico 1',
        plate: 'AA-00-AA',
        serviceType: 'delivery',
        time: '09:00',
      },
      newTime: '09:30',
      user: {
        uid: 'user-1',
        email: 'maria@example.com',
        displayName: 'Maria Silva',
      },
    })

    expect(batchSetMock).toHaveBeenCalledTimes(2)

    const [, activityPayload] = batchSetMock.mock.calls[1]
    expect(activityPayload).toMatchObject({
      actionType: 'time_change',
      itemId: 'item-1',
      reservationId: 'reservation-1',
      plate: 'AA-00-AA',
      oldTime: '09:00',
      newTime: '09:30',
    })
    expect(batchCommitMock).toHaveBeenCalledTimes(1)
  })
})
