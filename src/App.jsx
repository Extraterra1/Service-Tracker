import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AuthPanel from './components/AuthPanel';
import DateNavigator from './components/DateNavigator';
import ServicePane from './components/ServicePane';
import { checkAllowlist, configureAuthPersistence, signInWithGoogle, signOutUser, subscribeToAuthChanges } from './lib/auth';
import { fetchServiceDay } from './lib/api';
import { getTodayDate } from './lib/date';
import { hasFirebaseConfig } from './lib/firebase';
import { saveUserPin, subscribeToUserPin } from './lib/pinStore';
import { setItemDoneState, subscribeToDateStatus } from './lib/statusStore';

const PIN_STORAGE_KEY = 'service_tracker_api_pin';
const THEME_STORAGE_KEY = 'service_tracker_theme';

function getStoredPin() {
  const durablePin = localStorage.getItem(PIN_STORAGE_KEY);
  if (durablePin) {
    return durablePin;
  }

  // One-time migration for users that still have a session-only PIN.
  const sessionPin = sessionStorage.getItem(PIN_STORAGE_KEY);
  if (sessionPin) {
    localStorage.setItem(PIN_STORAGE_KEY, sessionPin);
    sessionStorage.removeItem(PIN_STORAGE_KEY);
    return sessionPin;
  }

  return '';
}

function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [forceRefresh, setForceRefresh] = useState(false);
  const [pin, setPin] = useState(getStoredPin);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light');
  const [pinSyncState, setPinSyncState] = useState('idle');
  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessState, setAccessState] = useState('signed_out');
  const [serviceData, setServiceData] = useState({ pickups: [], returns: [] });
  const [statusMap, setStatusMap] = useState({});
  const [loadingServices, setLoadingServices] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState('');
  const [lastLoadAt, setLastLoadAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const cloudPinRef = useRef('');
  const latestPinRef = useRef(pin);
  const hasLoadedCloudPinRef = useRef(false);
  const applyingCloudPinRef = useRef(false);

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

  const canLoadData = accessState === 'allowed' && Boolean(pin);

  const loadServiceData = useCallback(
    async ({ force = false } = {}) => {
      if (!canLoadData) {
        if (!pin) {
          setErrorMessage('Introduz o PIN da API para carregar serviços.');
        }
        return;
      }

      setErrorMessage('');
      setLoadingServices(true);
      try {
        const data = await fetchServiceDay({
          date: selectedDate,
          pin,
          forceRefresh: force
        });
        setServiceData(data);
        setLastLoadAt(new Date().toISOString());
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setLoadingServices(false);
      }
    },
    [canLoadData, pin, selectedDate]
  );

  useEffect(() => {
    if (canLoadData) {
      void loadServiceData();
    }
  }, [canLoadData, loadServiceData, selectedDate]);

  useEffect(() => {
    if (accessState !== 'allowed') {
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
  }, [accessState, selectedDate]);

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
        user
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUpdatingItemId('');
    }
  };

  const statusLine = useMemo(() => {
    if (!lastLoadAt) {
      return 'Ainda sem carregamento para esta data.';
    }

    const formatted = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(lastLoadAt));

    return `Última atualização manual: ${formatted}`;
  }, [lastLoadAt]);

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

            <p className="status-line status-line-menu">{statusLine}</p>
          </div>
        </details>
      </header>

      <DateNavigator
        date={selectedDate}
        onDateChange={setSelectedDate}
        onManualRefresh={() => loadServiceData({ force: forceRefresh })}
        forceRefresh={forceRefresh}
        onForceRefreshChange={setForceRefresh}
        loading={loadingServices}
      />

      {accessState === 'firebase_missing' ? <p className="error-banner">Configuração Firebase em falta. Preenche as variáveis `VITE_FIREBASE_*`.</p> : null}

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <main className="service-grid">
        <ServicePane
          title="Entregas"
          items={serviceData.pickups}
          statusMap={statusMap}
          onToggleDone={handleToggleDone}
          disabled={accessState !== 'allowed' || updatingItemId !== ''}
        />

        <ServicePane
          title="Recolhas"
          items={serviceData.returns}
          statusMap={statusMap}
          onToggleDone={handleToggleDone}
          disabled={accessState !== 'allowed' || updatingItemId !== ''}
        />
      </main>
    </div>
  );
}

export default App;
