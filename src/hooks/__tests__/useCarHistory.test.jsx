import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCarHistoryMock = vi.fn();
const getCarHistoryRangeMock = vi.fn();

vi.mock('../../lib/carHistoryStore', () => ({
  fetchCarHistory: (...args) => fetchCarHistoryMock(...args),
  getCarHistoryRange: (...args) => getCarHistoryRangeMock(...args)
}));

import { useCarHistory } from '../useCarHistory';

describe('useCarHistory', () => {
  beforeEach(() => {
    fetchCarHistoryMock.mockReset();
    getCarHistoryRangeMock.mockReset();
    getCarHistoryRangeMock.mockReturnValue({
      rangeStart: '2026-02-26',
      rangeEnd: '2026-03-28'
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads history data into popup state', async () => {
    fetchCarHistoryMock.mockResolvedValue({
      plateOptions: [{ value: 'AA00AA', label: 'AA-00-AA' }],
      entriesByPlate: {
        AA00AA: [{ id: 'entry-1', date: '2026-03-10' }]
      }
    });

    const { result } = renderHook(() =>
      useCarHistory({
        accessState: 'allowed'
      })
    );

    await act(async () => {
      await result.current.loadCarHistory();
    });

    expect(getCarHistoryRangeMock).toHaveBeenCalledTimes(1);
    expect(fetchCarHistoryMock).toHaveBeenCalledWith({
      rangeStart: '2026-02-26',
      rangeEnd: '2026-03-28'
    });
    expect(result.current.plateOptions).toEqual([{ value: 'AA00AA', label: 'AA-00-AA' }]);
    expect(result.current.entriesByPlate.AA00AA).toEqual([{ id: 'entry-1', date: '2026-03-10' }]);
    expect(result.current.rangeStart).toBe('2026-02-26');
    expect(result.current.rangeEnd).toBe('2026-03-28');
  });

  it('resets loaded popup state', async () => {
    fetchCarHistoryMock.mockResolvedValue({
      plateOptions: [{ value: 'AA00AA', label: 'AA-00-AA' }],
      entriesByPlate: {
        AA00AA: [{ id: 'entry-1' }]
      }
    });

    const { result } = renderHook(() =>
      useCarHistory({
        accessState: 'allowed'
      })
    );

    await act(async () => {
      await result.current.loadCarHistory();
    });

    act(() => {
      result.current.resetCarHistory();
    });

    expect(result.current.plateOptions).toEqual([]);
    expect(result.current.entriesByPlate).toEqual({});
    expect(result.current.rangeStart).toBe('');
    expect(result.current.rangeEnd).toBe('');
    expect(result.current.error).toBe('');
  });
});
