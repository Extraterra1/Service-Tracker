import { useCallback, useRef, useState } from 'react';
import { getLeaderboardCacheKey, normalizeLeaderboardPeriod } from '../lib/leaderboardPeriods';

const LEADERBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MIN_LOADING_MS = 250;

let leaderboardStoreModulePromise;

function loadLeaderboardStoreModule() {
  leaderboardStoreModulePromise ??= import('../lib/leaderboardStore');
  return leaderboardStoreModulePromise;
}

function toDateValue(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function normalizeLeaderboardRequest(value) {
  if (typeof value === 'string') {
    return {
      period: normalizeLeaderboardPeriod(value),
      now: new Date(),
    };
  }

  return {
    period: normalizeLeaderboardPeriod(value?.period),
    now: toDateValue(value?.now),
  };
}

export function useLeaderboardData({ accessState, minimumLoadingMs = DEFAULT_MIN_LOADING_MS }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const cacheRef = useRef(new Map());
  const requestIdRef = useRef(0);

  const loadLeaderboard = useCallback(
    async (requestInput) => {
      if (accessState !== 'allowed') {
        return null;
      }

      const request = normalizeLeaderboardRequest(requestInput);
      const { fetchLeaderboard } = await loadLeaderboardStoreModule();
      const cacheKey = getLeaderboardCacheKey(request.period, request.now);
      const cachedEntry = cacheRef.current.get(cacheKey);
      const nowMs = Date.now();
      if (cachedEntry && nowMs - cachedEntry.loadedAtMs < LEADERBOARD_CACHE_TTL_MS) {
        requestIdRef.current += 1;
        setData(cachedEntry.data);
        setLoading(false);
        setLastLoadedAt(new Date(cachedEntry.loadedAtMs));
        setError('');
        return cachedEntry.data;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const startedAtMs = nowMs;
      setLoading(true);
      setError('');

      try {
        const response = await fetchLeaderboard(request);

        if (requestIdRef.current !== requestId) {
          return null;
        }

        const loadedAtMs = Date.now();
        cacheRef.current.set(cacheKey, {
          data: response,
          loadedAtMs
        });
        setData(response);
        setLastLoadedAt(new Date(loadedAtMs));
        return response;
      } catch (nextError) {
        if (requestIdRef.current !== requestId) {
          return null;
        }

        setError(nextError.message);
        return null;
      } finally {
        const elapsedMs = Date.now() - startedAtMs;
        const remainingDelayMs = minimumLoadingMs - elapsedMs;

        if (remainingDelayMs > 0) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, remainingDelayMs);
          });
        }

        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [accessState, minimumLoadingMs]
  );

  const resetLeaderboard = useCallback(() => {
    requestIdRef.current += 1;
    cacheRef.current.clear();
    setData(null);
    setLoading(false);
    setError('');
    setLastLoadedAt(null);
  }, []);

  return {
    data,
    loading,
    error,
    lastLoadedAt,
    loadLeaderboard,
    resetLeaderboard
  };
}
