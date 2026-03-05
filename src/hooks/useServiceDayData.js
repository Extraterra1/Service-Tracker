import { useCallback, useEffect, useRef, useState } from 'react';
import { toDateValue } from '../lib/timestamp';

let apiModulePromise;
let scrapedDataModulePromise;
let refreshLockModulePromise;

function loadApiModule() {
  apiModulePromise ??= import('../lib/api');
  return apiModulePromise;
}

function loadScrapedDataModule() {
  scrapedDataModulePromise ??= import('../lib/scrapedDataStore');
  return scrapedDataModulePromise;
}

function loadRefreshLockModule() {
  refreshLockModulePromise ??= import('../lib/serviceRefreshLockStore');
  return refreshLockModulePromise;
}

function getCacheVersionKey(cachedAt) {
  const cacheDate = toDateValue(cachedAt);
  return cacheDate ? String(cacheDate.getTime()) : 'missing-cachedAt';
}

export function useServiceDayData({ canReadServiceData, selectedDate, pin, userUid }) {
  const [serviceData, setServiceData] = useState({ pickups: [], returns: [] });
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDateData, setLoadingDateData] = useState(true);
  const [hasDayResponse, setHasDayResponse] = useState(false);
  const [refreshSource, setRefreshSource] = useState('idle');
  const [lastLoadAt, setLastLoadAt] = useState(null);
  const [staleWarning, setStaleWarning] = useState('');
  const [error, setError] = useState('');

  const refreshInFlightRef = useRef(false);
  const autoRefreshAttemptRef = useRef(new Set());

  const canCallApi = canReadServiceData && Boolean(pin);

  const refreshServiceDataFromApi = useCallback(
    async ({ date, forceRefresh, source, hasRenderableData, cacheVersion }) => {
      if (!canReadServiceData) {
        return false;
      }

      if (!canCallApi) {
        const pinError = 'Introduz o PIN da API para atualizar os serviços.';
        if (source === 'manual') {
          setError(pinError);
        } else if (hasRenderableData) {
          setStaleWarning('Dados desatualizados (mais de 30 minutos). Introduz o PIN para atualizar.');
        } else {
          setError(pinError);
        }
        return false;
      }

      if (refreshInFlightRef.current) {
        return false;
      }

      if (source === 'auto') {
        try {
          const { tryAcquireAutoRefreshLease } = await loadRefreshLockModule();
          const leaseResult = await tryAcquireAutoRefreshLease({
            date,
            userUid,
            cacheVersion
          });

          if (!leaseResult?.acquired) {
            return false;
          }
        } catch {
          // If lock resolution fails unexpectedly, continue with refresh to avoid stale data.
        }
      }

      refreshInFlightRef.current = true;
      setLoadingServices(true);
      setRefreshSource(source);

      if (source === 'manual') {
        setError('');
      }

      try {
        const { refreshServiceDayViaApi } = await loadApiModule();
        await refreshServiceDayViaApi({
          date,
          pin,
          forceRefresh
        });

        if (source === 'manual') {
          setStaleWarning('');
        }

        return true;
      } catch (nextError) {
        if (source === 'manual') {
          setError(nextError.message);
        } else if (hasRenderableData) {
          setStaleWarning('Dados desatualizados. Falha na atualização automática. Usa Atualizar para tentar novamente.');
        } else {
          setError(nextError.message);
        }
        return false;
      } finally {
        refreshInFlightRef.current = false;
        setLoadingServices(false);
        setRefreshSource('idle');
      }
    },
    [canCallApi, canReadServiceData, pin, userUid]
  );

  useEffect(() => {
    autoRefreshAttemptRef.current = new Set();
    setStaleWarning('');
    setError('');

    if (!canReadServiceData) {
      setServiceData({ pickups: [], returns: [] });
      setLastLoadAt(null);
      setLoadingDateData(false);
      setHasDayResponse(false);
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setLoadingDateData(true);
    setHasDayResponse(false);

    void loadScrapedDataModule()
      .then(({ isScrapedDocStale, subscribeToScrapedDay }) => {
        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToScrapedDay(
          selectedDate,
          (payload) => {
            if (!isActive) {
              return;
            }

            setServiceData({ pickups: payload.pickups, returns: payload.returns });
            setLastLoadAt(payload.cachedAt ?? null);
            setHasDayResponse(true);
            setLoadingDateData(false);

            const isStale = isScrapedDocStale(payload.cachedAt);
            if (!isStale) {
              setStaleWarning('');
              return;
            }

            const staleKey = `${selectedDate}:${getCacheVersionKey(payload.cachedAt)}`;
            if (autoRefreshAttemptRef.current.has(staleKey)) {
              return;
            }

            autoRefreshAttemptRef.current.add(staleKey);
            void refreshServiceDataFromApi({
              date: selectedDate,
              forceRefresh: false,
              source: 'auto',
              hasRenderableData: true,
              cacheVersion: getCacheVersionKey(payload.cachedAt)
            });
          },
          () => {
            if (!isActive) {
              return;
            }

            setServiceData({ pickups: [], returns: [] });
            setLastLoadAt(null);

            const missingKey = `${selectedDate}:missing`;
            if (autoRefreshAttemptRef.current.has(missingKey)) {
              return;
            }

            autoRefreshAttemptRef.current.add(missingKey);
            void refreshServiceDataFromApi({
              date: selectedDate,
              forceRefresh: false,
              source: 'auto',
              hasRenderableData: false,
              cacheVersion: 'missing-cachedAt'
            }).then((success) => {
              if (!isActive) {
                return;
              }

              if (!success) {
                setLoadingDateData(false);
              }
            });
          },
          (nextError) => {
            if (!isActive) {
              return;
            }

            setError(nextError.message);
            setLoadingDateData(false);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setError(nextError.message);
        setLoadingDateData(false);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, refreshServiceDataFromApi, selectedDate]);

  const manualRefresh = useCallback(() => {
    void refreshServiceDataFromApi({
      date: selectedDate,
      forceRefresh: true,
      source: 'manual',
      hasRenderableData: serviceData.pickups.length + serviceData.returns.length > 0
    });
  }, [refreshServiceDataFromApi, selectedDate, serviceData.pickups.length, serviceData.returns.length]);

  return {
    serviceData,
    loadingServices,
    loadingDateData,
    hasDayResponse,
    refreshSource,
    lastLoadAt,
    staleWarning,
    error,
    manualRefresh
  };
}
