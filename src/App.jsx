import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AuthPanel from './components/AuthPanel';
import DateNavigator from './components/DateNavigator';
import ServicePane from './components/ServicePane';
import { checkAllowlist, configureAuthPersistence, signInWithGoogle, signOutUser, subscribeToAuthChanges } from './lib/auth';
import { refreshServiceDayViaApi } from './lib/api';
import { getTodayDate } from './lib/date';
import { hasFirebaseConfig } from './lib/firebase';
import { saveUserPin, subscribeToUserPin } from './lib/pinStore';
import { isScrapedDocStale, subscribeToScrapedDay } from './lib/scrapedDataStore';
import { setItemDoneState, subscribeToDateStatus } from './lib/statusStore';

const PIN_STORAGE_KEY = 'service_tracker_api_pin';
const THEME_STORAGE_KEY = 'service_tracker_theme';
const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000;

function normalizePlate(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getPlateColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 78% 42%)`;
}

function getStoredPin() {
  const durablePin = localStorage.getItem(PIN_STORAGE_KEY);
  if (durablePin) {
    return durablePin;
  }

  const sessionPin = sessionStorage.getItem(PIN_STORAGE_KEY);
  if (sessionPin) {
    localStorage.setItem(PIN_STORAGE_KEY, sessionPin);
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    return sessionPin;
  }

  return '';
}

function toDateValue(timestampLike) {
  if (!timestampLike) {
    return null;
  }

  if (typeof timestampLike.toDate === 'function') {
    return timestampLike.toDate();
  }

  if (typeof timestampLike.seconds === 'number') {
    return new Date(timestampLike.seconds * 1000);
  }

  const parsed = new Date(timestampLike);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getCacheVersionKey(cachedAt) {
  const cacheDate = toDateValue(cachedAt);
  return cacheDate ? String(cacheDate.getTime()) : 'missing-cachedAt';
}

function getMenuItemLabel(item) {
  const serviceLabel = item.serviceType === 'return' ? 'Recolha' : 'Entrega';
  const itemName = item.name || item.id || item.itemId;
  return `${item.time || '--:--'} - ${serviceLabel} - ${itemName}`;
}

function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [pin, setPin] = useState(getStoredPin);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light');
  const [pinSyncState, setPinSyncState] = useState('idle');
  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessState, setAccessState] = useState('signed_out');
  const [serviceData, setServiceData] = useState({ pickups: [], returns: [] });
  const [statusMap, setStatusMap] = useState({});
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDateData, setLoadingDateData] = useState(false);
  const [refreshSource, setRefreshSource] = useState('idle');
  const [updatingItemId, setUpdatingItemId] = useState('');
  const [manualCompletedItemId, setManualCompletedItemId] = useState('');
  const [lastLoadAt, setLastLoadAt] = useState(null);
  const [staleWarning, setStaleWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const cloudPinRef = useRef('');
  const latestPinRef = useRef(pin);
  const hasLoadedCloudPinRef = useRef(false);
  const applyingCloudPinRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const autoRefreshAttemptRef = useRef(new Set());

  useEffect(() => {
    void configureAuthPersistence();
  }, []);

  useEffect(() => {
    latestPinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    if (pin) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
    } else {
      localStorage.removeItem(PIN_STORAGE_KEY);
    }
  }, [pin]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    cloudPinRef.current = '';
    hasLoadedCloudPinRef.current = false;

    if (accessState !== 'allowed' || !user?.uid) {
      setPinSyncState('idle');
      return () => {};
    }

    setPinSyncState('syncing');

    return subscribeToUserPin(
      user.uid,
      (cloudPin) => {
        const normalizedCloudPin = String(cloudPin ?? '')
          .replace(/[^0-9]/g, '')
          .slice(0, 4);

        hasLoadedCloudPinRef.current = true;
        cloudPinRef.current = normalizedCloudPin;

        if (normalizedCloudPin && normalizedCloudPin !== latestPinRef.current) {
          applyingCloudPinRef.current = true;
          setPin(normalizedCloudPin);
        } else if (!normalizedCloudPin && latestPinRef.current) {
          void saveUserPin(user.uid, latestPinRef.current).catch((error) => {
            setPinSyncState('error');
            setErrorMessage(error.message);
          });
        }

        setPinSyncState('synced');
      },
      (error) => {
        setPinSyncState('error');
        setErrorMessage(error.message);
      }
    );
  }, [accessState, user?.uid]);

  useEffect(() => {
    if (applyingCloudPinRef.current) {
      applyingCloudPinRef.current = false;
      return;
    }

    if (accessState !== 'allowed' || !user?.uid) {
      return;
    }

    if (!hasLoadedCloudPinRef.current) {
      return;
    }

    if (pin === cloudPinRef.current) {
      return;
    }

    setPinSyncState('syncing');
    void saveUserPin(user.uid, pin)
      .then(() => {
        cloudPinRef.current = pin;
        setPinSyncState('synced');
      })
      .catch((error) => {
        setPinSyncState('error');
        setErrorMessage(error.message);
      });
  }, [accessState, pin, user?.uid]);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setAccessState('firebase_missing');
      setCheckingAccess(false);
      return () => {};
    }

    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setErrorMessage('');
      setUser(currentUser);

      if (!currentUser) {
        setAccessState('signed_out');
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(true);
      try {
        const accessResult = await checkAllowlist(currentUser.uid);
        setAccessState(accessResult.allowed ? 'allowed' : 'denied');
      } catch (error) {
        setAccessState('denied');
        setErrorMessage(error.message);
      } finally {
        setCheckingAccess(false);
      }
    });

    return unsubscribe;
  }, []);

  const canReadServiceData = accessState === 'allowed';
  const canCallApi = canReadServiceData && Boolean(pin);
  const allServiceItems = useMemo(() => [...serviceData.pickups, ...serviceData.returns], [serviceData.pickups, serviceData.returns]);
  const sharedPlateMarkers = useMemo(() => {
    const pickupPlates = new Set(
      serviceData.pickups
        .map((item) => normalizePlate(item.plate))
        .filter(Boolean),
    );
    const returnPlates = new Set(
      serviceData.returns
        .map((item) => normalizePlate(item.plate))
        .filter(Boolean),
    );

    const shared = [...pickupPlates]
      .filter((plate) => returnPlates.has(plate))
      .sort((a, b) => a.localeCompare(b));

    return shared.reduce((acc, plate, index) => {
      acc[plate] = {
        color: getPlateColor(index),
      };
      return acc;
    }, {});
  }, [serviceData.pickups, serviceData.returns]);
  const manualCompletedCandidates = useMemo(() => {
    const nowMs = Date.now();
    return allServiceItems.filter((item) => {
      const status = statusMap[item.itemId];
      if (status?.done !== true) {
        return false;
      }

      const updatedAt = toDateValue(status.updatedAt);
      if (!updatedAt) {
        return true;
      }

      return nowMs - updatedAt.getTime() <= COMPLETED_HIDE_AFTER_MS;
    });
  }, [allServiceItems, statusMap]);

  const refreshServiceDataFromApi = useCallback(
    async ({ date, forceRefresh, source, hasRenderableData }) => {
      if (!canReadServiceData) {
        return false;
      }

      if (!canCallApi) {
        const pinError = 'Introduz o PIN da API para atualizar os serviços.';
        if (source === 'manual') {
          setErrorMessage(pinError);
        } else if (hasRenderableData) {
          setStaleWarning('Dados desatualizados (mais de 2 horas). Introduz o PIN para atualizar.');
        } else {
          setErrorMessage(pinError);
        }
        return false;
      }

      if (refreshInFlightRef.current) {
        return false;
      }

      refreshInFlightRef.current = true;
      setLoadingServices(true);
      setRefreshSource(source);

      if (source === 'manual') {
        setErrorMessage('');
      }

      try {
        await refreshServiceDayViaApi({
          date,
          pin,
          forceRefresh,
        });

        if (source === 'manual') {
          setStaleWarning('');
        }

        return true;
      } catch (error) {
        if (source === 'manual') {
          setErrorMessage(error.message);
        } else if (hasRenderableData) {
          setStaleWarning('Dados desatualizados. Falha na atualização automática. Usa Atualizar para tentar novamente.');
        } else {
          setErrorMessage(error.message);
        }
        return false;
      } finally {
        refreshInFlightRef.current = false;
        setLoadingServices(false);
        setRefreshSource('idle');
      }
    },
    [canCallApi, canReadServiceData, pin]
  );

  useEffect(() => {
    autoRefreshAttemptRef.current = new Set();
    setStaleWarning('');

    if (!canReadServiceData) {
      setServiceData({ pickups: [], returns: [] });
      setLastLoadAt(null);
      setLoadingDateData(false);
      return () => {};
    }

    let isActive = true;
    setLoadingDateData(true);

    const unsubscribe = subscribeToScrapedDay(
      selectedDate,
      (payload) => {
        if (!isActive) {
          return;
        }

        setServiceData({ pickups: payload.pickups, returns: payload.returns });
        setLastLoadAt(payload.cachedAt ?? null);
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
        }).then((success) => {
          if (!isActive) {
            return;
          }

          if (!success) {
            setLoadingDateData(false);
          }
        });
      },
      (error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.message);
        setLoadingDateData(false);
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, refreshServiceDataFromApi, selectedDate]);

  useEffect(() => {
    if (!canReadServiceData) {
      setStatusMap({});
      return () => {};
    }

    return subscribeToDateStatus(
      selectedDate,
      (nextStatusMap) => {
        setStatusMap(nextStatusMap);
      },
      (error) => {
        setErrorMessage(error.message);
      }
    );
  }, [canReadServiceData, selectedDate]);

  useEffect(() => {
    if (manualCompletedCandidates.length === 0) {
      setManualCompletedItemId('');
      return;
    }

    const stillAvailable = manualCompletedCandidates.some((item) => item.itemId === manualCompletedItemId);
    if (!stillAvailable) {
      setManualCompletedItemId(manualCompletedCandidates[0].itemId);
    }
  }, [manualCompletedCandidates, manualCompletedItemId]);

  const handleSignIn = async () => {
    setErrorMessage('');
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleSignOut = async () => {
    setErrorMessage('');
    await signOutUser();
    setServiceData({ pickups: [], returns: [] });
    setStatusMap({});
    setLastLoadAt(null);
    setStaleWarning('');
  };

  const handleToggleDone = async (item, done) => {
    if (accessState !== 'allowed') {
      return;
    }

    setUpdatingItemId(item.itemId);
    setErrorMessage('');

    try {
      await setItemDoneState({
        date: selectedDate,
        item,
        done,
        user,
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUpdatingItemId('');
    }
  };

  const handleAddToCompleted = useCallback(async () => {
    if (accessState !== 'allowed') {
      return;
    }

    const item = manualCompletedCandidates.find((entry) => entry.itemId === manualCompletedItemId);
    if (!item) {
      return;
    }

    setUpdatingItemId(item.itemId);
    setErrorMessage('');

    try {
      await setItemDoneState({
        date: selectedDate,
        item,
        done: true,
        user,
        forceCompletedNow: true,
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUpdatingItemId('');
    }
  }, [accessState, manualCompletedCandidates, manualCompletedItemId, selectedDate, user]);

  const handleManualRefresh = useCallback(() => {
    void refreshServiceDataFromApi({
      date: selectedDate,
      forceRefresh: true,
      source: 'manual',
      hasRenderableData: serviceData.pickups.length + serviceData.returns.length > 0,
    });
  }, [refreshServiceDataFromApi, selectedDate, serviceData.pickups.length, serviceData.returns.length]);

  const statusLine = useMemo(() => {
    if (loadingServices && refreshSource === 'manual') {
      return 'Atualização manual forçada em curso...';
    }

    if (loadingServices && refreshSource === 'auto') {
      return 'Cache antigo detetado. A atualizar automaticamente...';
    }

    const cachedDate = toDateValue(lastLoadAt);
    if (!cachedDate) {
      return 'Sem cache Firestore para esta data.';
    }

    const formatted = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(cachedDate);

    return `Cache Firestore: ${formatted}`;
  }, [lastLoadAt, loadingServices, refreshSource]);

  return (
    <div className="app-shell">
      <header className="app-header app-header-compact">
        <div className="title-block">
          <p className="eyebrow">JustDrive</p>
          <h1>Lista de Serviço</h1>
        </div>

        <details className="menu-panel">
          <summary className="ghost-btn menu-summary">Menu</summary>
          <div className="menu-content">
            <p className="menu-title">Operação diária</p>
            <p className="subtle-text">Conta, PIN e estado de sincronização.</p>
            <label className="theme-toggle" htmlFor="theme-switch">
              <input
                id="theme-switch"
                type="checkbox"
                checked={theme === 'dark'}
                onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
              />
              <span>Modo escuro</span>
            </label>

            <AuthPanel
              user={user}
              accessState={accessState}
              checkingAccess={checkingAccess}
              pin={pin}
              pinSyncState={pinSyncState}
              onPinChange={setPin}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
            />

            <div className="menu-completed-panel">
              <p className="menu-subtitle">Completados</p>
              <p className="subtle-text">Move um serviço concluído para a secção "Completados" sem esperar 1 hora.</p>
              <div className="manual-completed-controls">
                <select
                  className="manual-completed-select"
                  value={manualCompletedItemId}
                  onChange={(event) => setManualCompletedItemId(event.target.value)}
                  disabled={manualCompletedCandidates.length === 0 || updatingItemId !== ''}
                >
                  {manualCompletedCandidates.length === 0 ? <option value="">Sem concluídos recentes</option> : null}
                  {manualCompletedCandidates.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {getMenuItemLabel(item)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="ghost-btn compact-btn"
                  onClick={handleAddToCompleted}
                  disabled={!manualCompletedItemId || updatingItemId !== ''}
                >
                  Adicionar
                </button>
              </div>
            </div>

            <p className="status-line status-line-menu">{statusLine}</p>
          </div>
        </details>
      </header>

      <DateNavigator
        date={selectedDate}
        onDateChange={setSelectedDate}
        onManualRefresh={handleManualRefresh}
        loading={loadingServices}
      />

      {accessState === 'firebase_missing' ? <p className="error-banner">Configuração Firebase em falta. Preenche as variáveis `VITE_FIREBASE_*`.</p> : null}

      {staleWarning ? <p className="warning-banner">{staleWarning}</p> : null}

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <main className="service-grid">
        <ServicePane
          title="Entregas"
          items={serviceData.pickups}
          statusMap={statusMap}
          sharedPlateMarkers={sharedPlateMarkers}
          onToggleDone={handleToggleDone}
          disabled={accessState !== 'allowed' || updatingItemId !== ''}
          loading={loadingDateData}
        />

        <ServicePane
          title="Recolhas"
          items={serviceData.returns}
          statusMap={statusMap}
          sharedPlateMarkers={sharedPlateMarkers}
          onToggleDone={handleToggleDone}
          disabled={accessState !== 'allowed' || updatingItemId !== ''}
          loading={loadingDateData}
        />
      </main>
    </div>
  );
}

export default App;
