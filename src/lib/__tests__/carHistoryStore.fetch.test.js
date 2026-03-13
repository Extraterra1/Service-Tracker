import { beforeEach, describe, expect, it, vi } from 'vitest';

const collectionMock = vi.fn();
const documentIdMock = vi.fn(() => '__name__');
const getDocsMock = vi.fn();
const orderByMock = vi.fn();
const queryMock = vi.fn((...clauses) => ({ clauses }));
const whereMock = vi.fn((...args) => ({ type: 'where', args }));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => collectionMock(...args),
  documentId: () => documentIdMock(),
  getDocs: (...args) => getDocsMock(...args),
  orderBy: (...args) => orderByMock(...args),
  query: (...args) => queryMock(...args),
  where: (...args) => whereMock(...args)
}));

vi.mock('../firebaseDb', () => ({
  db: { __name: 'mock-db' }
}));

import { fetchCarHistory } from '../carHistoryStore';

describe('fetchCarHistory', () => {
  beforeEach(() => {
    collectionMock.mockReset();
    documentIdMock.mockClear();
    getDocsMock.mockReset();
    orderByMock.mockReset();
    queryMock.mockClear();
    whereMock.mockClear();

    collectionMock.mockImplementation((_db, collectionName) => ({ collectionName }));
    getDocsMock
      .mockResolvedValueOnce({
        docs: [
          {
            id: '2026-03-10',
            data: () => ({
              date: '',
              pickups: [
                {
                  itemId: 'pickup-1',
                  id: 'RES-001',
                  name: 'Maria',
                  plate: 'AA-00-AA',
                  time: '09:00'
                }
              ],
              returns: []
            })
          }
        ]
      })
      .mockResolvedValueOnce({
        docs: []
      });
  });

  it('queries the scraped-day window without an explicit document-id orderBy', async () => {
    const history = await fetchCarHistory({
      rangeStart: '2026-02-26',
      rangeEnd: '2026-03-28'
    });

    expect(orderByMock).not.toHaveBeenCalled();
    expect(getDocsMock).toHaveBeenCalledTimes(2);
    expect(history.plateOptions).toEqual([{ value: 'AA00AA', label: 'AA-00-AA' }]);
    expect(history.entriesByPlate.AA00AA[0]).toMatchObject({
      date: '2026-03-10',
      reservationId: 'RES-001'
    });
  });
});
