import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchLeaderboardMock = vi.fn();

vi.mock('../../lib/leaderboardStore', () => ({
  fetchLeaderboard: (...args) => fetchLeaderboardMock(...args)
}));

import { useLeaderboardData } from '../useLeaderboardData';

function createLeaderboardResponse(label) {
  return {
    rows: [
      {
        key: `${label}-1`,
        rank: 1,
        score: 12,
        displayName: label,
        email: `${label.toLowerCase()}@example.com`,
        photoURL: ''
      }
    ],
    totalActions: 12,
    participants: 1,
    capped: false
  };
}

describe('useLeaderboardData', () => {
  beforeEach(() => {
    fetchLeaderboardMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reuses warm cache for the same period within the TTL', async () => {
    fetchLeaderboardMock.mockResolvedValue(createLeaderboardResponse('Weekly Warm'));

    const { result } = renderHook(() =>
      useLeaderboardData({
        accessState: 'allowed',
        minimumLoadingMs: 0
      })
    );

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    expect(fetchLeaderboardMock).toHaveBeenCalledTimes(1);
    expect(result.current.data?.rows[0]?.displayName).toBe('Weekly Warm');

    fetchLeaderboardMock.mockResolvedValue(createLeaderboardResponse('Weekly Cold'));

    act(() => {
      vi.advanceTimersByTime(4 * 60 * 1000);
    });

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    expect(fetchLeaderboardMock).toHaveBeenCalledTimes(1);
    expect(result.current.data?.rows[0]?.displayName).toBe('Weekly Warm');
  });

  it('switches back to a cached period without refetching', async () => {
    fetchLeaderboardMock
      .mockResolvedValueOnce(createLeaderboardResponse('Weekly'))
      .mockResolvedValueOnce(createLeaderboardResponse('Monthly'));

    const { result } = renderHook(() =>
      useLeaderboardData({
        accessState: 'allowed',
        minimumLoadingMs: 0
      })
    );

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
      await result.current.loadLeaderboard('monthly');
    });

    expect(fetchLeaderboardMock).toHaveBeenCalledTimes(2);
    expect(result.current.data?.rows[0]?.displayName).toBe('Monthly');

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    expect(fetchLeaderboardMock).toHaveBeenCalledTimes(2);
    expect(result.current.data?.rows[0]?.displayName).toBe('Weekly');
  });

  it('keeps the cached period selected when an older in-flight request resolves later', async () => {
    let resolveMonthlyRequest;

    fetchLeaderboardMock
      .mockResolvedValueOnce(createLeaderboardResponse('Weekly'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMonthlyRequest = resolve;
          })
      );

    const { result } = renderHook(() =>
      useLeaderboardData({
        accessState: 'allowed',
        minimumLoadingMs: 0
      })
    );

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    await act(async () => {
      void result.current.loadLeaderboard('monthly');
    });

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    expect(result.current.data?.rows[0]?.displayName).toBe('Weekly');
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolveMonthlyRequest(createLeaderboardResponse('Monthly'));
      await Promise.resolve();
    });

    expect(result.current.data?.rows[0]?.displayName).toBe('Weekly');
  });

  it('refetches after the cache TTL expires', async () => {
    fetchLeaderboardMock
      .mockResolvedValueOnce(createLeaderboardResponse('Weekly First'))
      .mockResolvedValueOnce(createLeaderboardResponse('Weekly Second'));

    const { result } = renderHook(() =>
      useLeaderboardData({
        accessState: 'allowed',
        minimumLoadingMs: 0
      })
    );

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    });

    await act(async () => {
      await result.current.loadLeaderboard('weekly');
    });

    expect(fetchLeaderboardMock).toHaveBeenCalledTimes(2);
    expect(result.current.data?.rows[0]?.displayName).toBe('Weekly Second');
  });
});
