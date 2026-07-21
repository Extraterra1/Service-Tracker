import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const collectionMock = vi.fn();
const docMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __type: 'serverTimestamp' }));
const writeBatchMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...args) => collectionMock(...args),
  doc: (...args) => docMock(...args),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  serverTimestamp: () => serverTimestampMock(),
  where: vi.fn(),
  writeBatch: (...args) => writeBatchMock(...args)
}));

vi.mock('../firebaseDb', () => ({ db: { __name: 'mock-db' } }));

import { setItemTransferredState } from '../transferStore';

describe('transferStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'));
    collectionMock.mockReset();
    docMock.mockReset();
    serverTimestampMock.mockClear();
    writeBatchMock.mockReset();
    collectionMock.mockImplementation((_db, collectionName, date, subcollectionName) => ({ collectionName, date, subcollectionName }));
    docMock.mockImplementation((...args) => ({ __type: 'doc', args }));
  });

  afterEach(() => vi.useRealTimers());

  it.each([
    ['non-current date', { date: '2026-03-06', item: { itemId: 'item-1', serviceType: 'return', plate: 'AA-00-AA' } }, 'Só é possível alterar o dia atual.'],
    ['delivery item', { date: '2026-03-07', item: { itemId: 'item-1', serviceType: 'pickup', plate: 'AA-00-AA' } }, 'Transfer state is only available for returns.'],
    ['missing plate', { date: '2026-03-07', item: { itemId: 'item-1', serviceType: 'return', plate: '' } }, 'Cannot update transfer state without license plate.']
  ])('rejects %s before touching Firestore', async (_label, input, message) => {
    await expect(setItemTransferredState({ ...input, transferred: true, user: { uid: 'user-1' } })).rejects.toThrow(message);
    expect(writeBatchMock).not.toHaveBeenCalled();
  });

  it('batches the transfer record with its activity entry', async () => {
    const set = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    writeBatchMock.mockReturnValue({ set, commit });

    await setItemTransferredState({
      date: '2026-03-07',
      item: { itemId: 'item-1', id: 'reservation-1', serviceType: 'return', plate: ' AA-00-AA ', name: 'Cliente', time: '09:00' },
      transferred: true,
      user: { uid: 'user-1', email: 'maria@example.com', displayName: 'Maria Silva' }
    });

    expect(docMock).toHaveBeenCalledWith({ __name: 'mock-db' }, 'service_transfer', '2026-03-07_item-1');
    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls[0][1]).toMatchObject({
      date: '2026-03-07', itemId: 'item-1', serviceType: 'return', plate: 'AA-00-AA', transferred: true,
      updatedByUid: 'user-1', updatedByName: 'Maria', updatedByEmail: 'maria@example.com'
    });
    expect(set.mock.calls[1][1]).toMatchObject({
      actionType: 'transfer_toggle', date: '2026-03-07', itemId: 'item-1', serviceType: 'return',
      done: false, transferred: true, plate: 'AA-00-AA', reservationId: 'reservation-1'
    });
    expect(commit).toHaveBeenCalledOnce();
  });
});
