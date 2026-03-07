import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const subscribeToDateActivityMock = vi.fn();

vi.mock('../../lib/activityStore', () => ({
  subscribeToDateActivity: (...args) => subscribeToDateActivityMock(...args)
}));

import { useActivityEntries } from '../useActivityEntries';

describe('useActivityEntries', () => {
  beforeEach(() => {
    subscribeToDateActivityMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('subscribes only when enabled and clears entries when disabled again', async () => {
    const unsubscribe = vi.fn();

    subscribeToDateActivityMock.mockImplementation((_selectedDate, onEntries) => {
      onEntries([
        {
          id: 'entry-1',
          itemId: 'item-1'
        }
      ]);
      return unsubscribe;
    });

    const { result, rerender } = renderHook(
      ({ enabled, selectedDate }) =>
        useActivityEntries({
          enabled,
          selectedDate
        }),
      {
        initialProps: {
          enabled: false,
          selectedDate: '2026-03-05'
        }
      }
    );

    expect(subscribeToDateActivityMock).not.toHaveBeenCalled();
    expect(result.current.activityEntries).toEqual([]);
    expect(result.current.loadingActivity).toBe(false);

    rerender({
      enabled: true,
      selectedDate: '2026-03-05'
    });

    await waitFor(() => {
      expect(subscribeToDateActivityMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.activityEntries).toEqual([
        {
          id: 'entry-1',
          itemId: 'item-1'
        }
      ]);
      expect(result.current.loadingActivity).toBe(false);
    });

    rerender({
      enabled: false,
      selectedDate: '2026-03-06'
    });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribeToDateActivityMock).toHaveBeenCalledTimes(1);
    expect(result.current.activityEntries).toEqual([]);
    expect(result.current.loadingActivity).toBe(false);
  });

  it('resubscribes when the selected date changes while enabled', async () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();

    subscribeToDateActivityMock
      .mockImplementationOnce((_selectedDate, onEntries) => {
        onEntries([{ id: 'entry-1', itemId: 'item-1' }]);
        return firstUnsubscribe;
      })
      .mockImplementationOnce((_selectedDate, onEntries) => {
        onEntries([{ id: 'entry-2', itemId: 'item-2' }]);
        return secondUnsubscribe;
      });

    const { result, rerender } = renderHook(
      ({ selectedDate }) =>
        useActivityEntries({
          enabled: true,
          selectedDate
        }),
      {
        initialProps: {
          selectedDate: '2026-03-05'
        }
      }
    );

    await waitFor(() => {
      expect(subscribeToDateActivityMock).toHaveBeenCalledWith('2026-03-05', expect.any(Function), expect.any(Function));
    });

    rerender({
      selectedDate: '2026-03-06'
    });

    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(subscribeToDateActivityMock).toHaveBeenCalledWith('2026-03-06', expect.any(Function), expect.any(Function));
      expect(result.current.activityEntries).toEqual([{ id: 'entry-2', itemId: 'item-2' }]);
    });
  });
});
