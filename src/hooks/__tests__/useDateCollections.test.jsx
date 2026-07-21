import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const subscribeToDateStatus = vi.fn();
const subscribeToDateTimeOverrides = vi.fn();
const subscribeToDateReady = vi.fn();
const subscribeToDateTransfers = vi.fn();

vi.mock('../../lib/statusStore', () => ({ subscribeToDateStatus }));
vi.mock('../../lib/timeOverrideStore', () => ({ subscribeToDateTimeOverrides }));
vi.mock('../../lib/readyStore', () => ({ subscribeToDateReady }));
vi.mock('../../lib/transferStore', () => ({ subscribeToDateTransfers }));

import { useDateCollections } from '../useDateCollections';

describe('useDateCollections transfer subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    [subscribeToDateStatus, subscribeToDateTimeOverrides, subscribeToDateReady, subscribeToDateTransfers]
      .forEach((subscribe) => subscribe.mockReturnValue(vi.fn()));
  });

  it('applies transfer changes and clears them when access is lost', async () => {
    let emitTransfers;
    subscribeToDateTransfers.mockImplementation((_date, callback) => {
      emitTransfers = callback;
      return vi.fn();
    });

    const { result, rerender } = renderHook(
      ({ canReadServiceData }) => useDateCollections({ canReadServiceData, selectedDate: '2026-03-07' }),
      { initialProps: { canReadServiceData: true } }
    );

    await waitFor(() => expect(subscribeToDateTransfers).toHaveBeenCalledWith('2026-03-07', expect.any(Function), expect.any(Function)));
    act(() => emitTransfers([{ changeType: 'added', itemId: 'return-1', transfer: { transferred: true, plate: 'AA-00-AA' } }]));
    expect(result.current.transferMap['return-1']).toMatchObject({ transferred: true, plate: 'AA-00-AA' });

    rerender({ canReadServiceData: false });
    await waitFor(() => expect(result.current.transferMap).toEqual({}));
  });

  it('surfaces transfer subscription errors', async () => {
    subscribeToDateTransfers.mockImplementation((_date, _callback, errorCallback) => {
      errorCallback(new Error('transfer unavailable'));
      return vi.fn();
    });

    const { result } = renderHook(() => useDateCollections({ canReadServiceData: true, selectedDate: '2026-03-07' }));
    await waitFor(() => expect(result.current.error).toBe('transfer unavailable'));
  });
});
