import { useCallback, useRef, useState } from 'react';

let carHistoryStoreModulePromise;

function loadCarHistoryStoreModule() {
  carHistoryStoreModulePromise ??= import('../lib/carHistoryStore');
  return carHistoryStoreModulePromise;
}

export function useCarHistory({ accessState }) {
  const [plateOptions, setPlateOptions] = useState([]);
  const [entriesByPlate, setEntriesByPlate] = useState({});
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const loadCarHistory = useCallback(async () => {
    if (accessState !== 'allowed') {
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');

    try {
      const { fetchCarHistory, getCarHistoryRange } = await loadCarHistoryStoreModule();
      const nextRange = getCarHistoryRange();
      const response = await fetchCarHistory(nextRange);

      if (requestIdRef.current !== requestId) {
        return null;
      }

      setPlateOptions(response.plateOptions);
      setEntriesByPlate(response.entriesByPlate);
      setRangeStart(nextRange.rangeStart);
      setRangeEnd(nextRange.rangeEnd);
      return response;
    } catch (nextError) {
      if (requestIdRef.current !== requestId) {
        return null;
      }

      setError(nextError.message);
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [accessState]);

  const resetCarHistory = useCallback(() => {
    requestIdRef.current += 1;
    setPlateOptions([]);
    setEntriesByPlate({});
    setRangeStart('');
    setRangeEnd('');
    setLoading(false);
    setError('');
  }, []);

  return {
    plateOptions,
    entriesByPlate,
    rangeStart,
    rangeEnd,
    loading,
    error,
    loadCarHistory,
    resetCarHistory
  };
}
