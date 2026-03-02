import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AccessGateScreen from './components/AccessGateScreen';
import ActivityPopup from './components/ActivityPopup';
import AppHeaderMenu from './components/AppHeaderMenu';
import DateNavigator from './components/DateNavigator';
import SignedOutLanding from './components/SignedOutLanding';
import { signInWithGoogle, signOutUser } from './lib/auth';
import { getTodayDate } from './lib/date';
import { useAccessGate } from './hooks/useAccessGate';
import { useDateCollections } from './hooks/useDateCollections';
import { usePinSync } from './hooks/usePinSync';
import { useServiceDayData } from './hooks/useServiceDayData';
import { toDateValue } from './lib/timestamp';

const ServiceWorkspace = lazy(() => import('./features/service-workspace/ServiceWorkspace'));

const PIN_STORAGE_KEY = 'service_tracker_api_pin';
const THEME_STORAGE_KEY = 'service_tracker_theme';
const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000;

let statusStoreModulePromise;
let timeOverrideStoreModulePromise;
let readyStoreModulePromise;
let staffProfileStoreModulePromise;

function loadStatusStoreModule() {
  statusStoreModulePromise ??= import('./lib/statusStore');
  return statusStoreModulePromise;
}

function loadTimeOverrideStoreModule() {
  timeOverrideStoreModulePromise ??= import('./lib/timeOverrideStore');
  return timeOverrideStoreModulePromise;
}

function loadReadyStoreModule() {
  readyStoreModulePromise ??= import('./lib/readyStore');
  return readyStoreModulePromise;
}

function loadStaffProfileStoreModule() {
  staffProfileStoreModulePromise ??= import('./lib/staffProfileStore');
  return staffProfileStoreModulePromise;
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

function isValidTimeInput(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value ?? '').trim());
}

function ServiceWorkspaceLoadingFallback() {
  return (
    <main className="service-grid" aria-busy="true">
      {['Entregas', 'Recolhas'].map((title) => (
        <section key={`fallback-${title}`} className="service-pane" aria-label={title}>
          <header className="pane-header">
            <h2>{title}</h2>
            <span>...</span>
          </header>

          <div className="pane-list">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={`${title}-skeleton-${index}`} className="service-item service-item-skeleton" aria-hidden="true">
                <div className="skeleton-line skeleton-line-time" />
                <div className="skeleton-line skeleton-line-name" />
                <div className="skeleton-line skeleton-line-sub" />
                <div className="skeleton-line skeleton-line-sub" />
                <div className="skeleton-line skeleton-line-footer" />
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function ServiceWorkspaceLocked({ lockedMessage }) {
  const message = lockedMessage || 'Inicia sessão para ver os serviços desta lista.';

  return (
    <main className="service-grid" aria-label="Service lists">
      {['Entregas', 'Recolhas'].map((title) => (
        <section key={`locked-${title}`} className="service-pane" aria-label={title}>
          <header className="pane-header">
            <h2>{title}</h2>
            <span>--</span>
          </header>

          <div className="pane-list pane-list-locked">
            <div className="pane-locked-state">
              <p className="empty-state empty-state-locked">{message}</p>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}

function App() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [pin, setPin] = useState(getStoredPin);
  const [theme, setTheme] = useState(() => (localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'));
  const {
    user,
    authHint,
    accessState,
    checkingAccess,
    accessGateMessage,
    accessPollInFlight,
    error: accessErrorMessage,
    retryAccessCheck
  } = useAccessGate();
  const canReadServiceData = accessState === 'allowed';
  const { pinSyncState, error: pinSyncErrorMessage } = usePinSync({
    accessState,
    user,
    pin,
    setPin
  });
  const {
    serviceData,
    loadingServices,
    loadingDateData,
    hasDayResponse,
    refreshSource,
    lastLoadAt,
    staleWarning,
    error: serviceDataErrorMessage,
    manualRefresh
  } = useServiceDayData({
    canReadServiceData,
    selectedDate,
    pin
  });
  const {
    statusMap,
    timeOverrideMap,
    readyMap,
    activityEntries,
    loadingActivity,
    error: dateCollectionsErrorMessage
  } = useDateCollections({
    canReadServiceData,
    selectedDate
  });
  const [updatingItemId, setUpdatingItemId] = useState('');
  const [manualCompletedItemId, setManualCompletedItemId] = useState('');
  const [timeOverrideItemId, setTimeOverrideItemId] = useState('');
  const [timeOverrideValue, setTimeOverrideValue] = useState('');
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const menuPanelRef = useRef(null);
  const lastSyncedProfileRef = useRef('');

  useEffect(() => {
    const handleOutsidePointerDown = (event) => {
      const menuElement = menuPanelRef.current;
      if (!menuElement?.open) {
        return;
      }

      if (event.target instanceof Node && !menuElement.contains(event.target)) {
        menuElement.removeAttribute('open');
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, []);

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
    if (!canReadServiceData || !user?.uid) {
      return;
    }

    const syncFingerprint = [user.uid, user.displayName ?? '', user.email ?? '', user.photoURL ?? ''].join('|');
    if (lastSyncedProfileRef.current === syncFingerprint) {
      return;
    }

    lastSyncedProfileRef.current = syncFingerprint;

    void loadStaffProfileStoreModule()
      .then(({ upsertOwnStaffProfile }) => upsertOwnStaffProfile(user))
      .catch((error) => {
        console.error('Failed to sync staff profile:', error);
      });
  }, [canReadServiceData, user]);

  const paneLoading = checkingAccess || (canReadServiceData && loadingDateData);
  const lockedListMessage = useMemo(() => {
    if (checkingAccess) {
      return '';
    }

    if (accessState === 'signed_out') {
      return 'Inicia sessão para ver os serviços desta lista.';
    }

    if (accessState === 'denied') {
      return 'Conta sem acesso. Pede ativação na allowlist.';
    }

    if (accessState === 'blocked') {
      return 'Conta bloqueada. Contacta o administrador.';
    }

    if (accessState === 'firebase_missing') {
      return 'Configuração Firebase em falta.';
    }

    return '';
  }, [accessState, checkingAccess]);

  const serviceDataWithOverrides = useMemo(() => {
    const withOverrides = (items) =>
      items.map((item) => {
        const overrideEntry = timeOverrideMap[item.itemId];
        const overrideTime = String(overrideEntry?.overrideTime ?? '').trim();
        if (!overrideTime) {
          return item;
        }

        return {
          ...item,
          overrideTime,
          displayTime: overrideTime
        };
      });

    return {
      pickups: withOverrides(serviceData.pickups),
      returns: withOverrides(serviceData.returns)
    };
  }, [serviceData.pickups, serviceData.returns, timeOverrideMap]);

  const allServiceItems = useMemo(
    () => [...serviceDataWithOverrides.pickups, ...serviceDataWithOverrides.returns],
    [serviceDataWithOverrides.pickups, serviceDataWithOverrides.returns]
  );

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

  const selectedTimeOverrideItem = useMemo(
    () => allServiceItems.find((item) => item.itemId === timeOverrideItemId) ?? null,
    [allServiceItems, timeOverrideItemId]
  );
  const selectedTimeOverrideOriginalTime = useMemo(
    () =>
      String(selectedTimeOverrideItem?.time ?? '')
        .trim()
        .slice(0, 5),
    [selectedTimeOverrideItem]
  );
  const canResetSelectedTimeOverride = useMemo(() => {
    if (!selectedTimeOverrideItem) {
      return false;
    }

    const hasManualOverride = Boolean(selectedTimeOverrideItem.overrideTime) && selectedTimeOverrideItem.overrideTime !== selectedTimeOverrideItem.time;

    return hasManualOverride && /^([01]\d|2[0-3]):([0-5]\d)$/.test(selectedTimeOverrideOriginalTime);
  }, [selectedTimeOverrideItem, selectedTimeOverrideOriginalTime]);
  const hasMenuTimeOverrideInput = String(timeOverrideValue ?? '').trim().length > 0;
  const isMenuTimeOverrideValid = isValidTimeInput(timeOverrideValue);

  useEffect(() => {
    setTimeOverrideItemId('');
    setTimeOverrideValue('');
  }, [selectedDate]);

  const activityTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  useEffect(() => {
    if (!canReadServiceData) {
      setActivityPopupOpen(false);
    }
  }, [canReadServiceData]);

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

  useEffect(() => {
    if (allServiceItems.length === 0) {
      setTimeOverrideItemId('');
      setTimeOverrideValue('');
      return;
    }

    const selectedItemStillExists = allServiceItems.some((item) => item.itemId === timeOverrideItemId);
    if (!selectedItemStillExists) {
      const firstItem = allServiceItems[0];
      setTimeOverrideItemId(firstItem.itemId);
      setTimeOverrideValue(firstItem.overrideTime || firstItem.displayTime || firstItem.time || '');
    }
  }, [allServiceItems, timeOverrideItemId]);

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
    try {
      await signOutUser();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setActivityPopupOpen(false);
      setTimeOverrideItemId('');
      setTimeOverrideValue('');
    }
  };

  const handleToggleDone = useCallback(
    async (item, done) => {
      if (accessState !== 'allowed') {
        return;
      }

      if (updatingItemId) {
        return;
      }

      setUpdatingItemId(item.itemId);
      setErrorMessage('');

      try {
        const { setItemDoneState } = await loadStatusStoreModule();
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
    },
    [accessState, selectedDate, updatingItemId, user]
  );

  const handleToggleReady = useCallback(
    async (item) => {
      if (accessState !== 'allowed') {
        return;
      }

      if (item?.serviceType !== 'pickup') {
        return;
      }

      if (updatingItemId) {
        return;
      }

      const plate = String(item?.plate ?? '').trim();
      if (!plate) {
        return;
      }

      const currentReady = readyMap[item.itemId]?.ready === true;
      const nextReady = !currentReady;

      setUpdatingItemId(item.itemId);
      setErrorMessage('');

      try {
        const { setItemReadyState } = await loadReadyStoreModule();
        await setItemReadyState({
          date: selectedDate,
          item,
          ready: nextReady,
          user
        });
      } catch (error) {
        setErrorMessage(error.message);
      } finally {
        setUpdatingItemId('');
      }
    },
    [accessState, readyMap, selectedDate, updatingItemId, user]
  );

  const handleAddToCompleted = useCallback(async () => {
    if (accessState !== 'allowed') {
      return;
    }

    const item = manualCompletedCandidates.find((entry) => entry.itemId === manualCompletedItemId);
    if (!item) {
      return;
    }

    if (updatingItemId) {
      return;
    }

    setUpdatingItemId(item.itemId);
    setErrorMessage('');

    try {
      const { setItemDoneState } = await loadStatusStoreModule();
      await setItemDoneState({
        date: selectedDate,
        item,
        done: true,
        user,
        forceCompletedNow: true
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUpdatingItemId('');
    }
  }, [accessState, manualCompletedCandidates, manualCompletedItemId, selectedDate, updatingItemId, user]);

  const handleTimeOverrideSelectionChange = useCallback(
    (nextItemId) => {
      setTimeOverrideItemId(nextItemId);
      const selectedItem = allServiceItems.find((item) => item.itemId === nextItemId);
      setTimeOverrideValue(selectedItem?.overrideTime || selectedItem?.displayTime || selectedItem?.time || '');
    },
    [allServiceItems]
  );

  const handleSaveItemTimeOverride = useCallback(
    async (item, nextTimeValue) => {
      if (accessState !== 'allowed') {
        return false;
      }

      if (!item?.itemId) {
        return false;
      }

      if (updatingItemId) {
        return false;
      }

      setUpdatingItemId(item.itemId);
      setErrorMessage('');

      try {
        const { setItemTimeOverride } = await loadTimeOverrideStoreModule();
        const normalizedTime = await setItemTimeOverride({
          date: selectedDate,
          item,
          newTime: nextTimeValue,
          user
        });

        if (item.itemId === timeOverrideItemId) {
          setTimeOverrideValue(normalizedTime);
        }

        return true;
      } catch (error) {
        setErrorMessage(error.message);
        return false;
      } finally {
        setUpdatingItemId('');
      }
    },
    [accessState, selectedDate, timeOverrideItemId, updatingItemId, user]
  );

  const handleSaveTimeOverride = useCallback(async () => {
    if (!selectedTimeOverrideItem || !isValidTimeInput(timeOverrideValue)) {
      return;
    }
    await handleSaveItemTimeOverride(selectedTimeOverrideItem, timeOverrideValue);
  }, [handleSaveItemTimeOverride, selectedTimeOverrideItem, timeOverrideValue]);

  const handleResetTimeOverride = useCallback(async () => {
    if (!selectedTimeOverrideItem || !canResetSelectedTimeOverride) {
      return;
    }

    await handleSaveItemTimeOverride(selectedTimeOverrideItem, selectedTimeOverrideOriginalTime);
  }, [canResetSelectedTimeOverride, handleSaveItemTimeOverride, selectedTimeOverrideItem, selectedTimeOverrideOriginalTime]);

  const handleOpenActivityPopup = useCallback(() => {
    menuPanelRef.current?.removeAttribute('open');
    setActivityPopupOpen(true);
  }, []);

  const handleCloseActivityPopup = useCallback(() => {
    setActivityPopupOpen(false);
  }, []);

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
      minute: '2-digit'
    }).format(cachedDate);

    return `Ultima Atualização: ${formatted}`;
  }, [lastLoadAt, loadingServices, refreshSource]);

  const showSignedOutLanding =
    accessState === 'signed_out' ||
    (checkingAccess && accessState === 'checking' && authHint !== 'signed_in');
  const showAccessGateScreen = !checkingAccess && (accessState === 'pending' || accessState === 'denied' || accessState === 'blocked');

  if (showSignedOutLanding) {
    return <SignedOutLanding onSignIn={handleSignIn} errorMessage={errorMessage || accessErrorMessage} signInDisabled={checkingAccess} />;
  }

  if (showAccessGateScreen) {
    return (
      <AccessGateScreen
        state={accessState}
        message={accessGateMessage || accessErrorMessage || errorMessage}
        checking={checkingAccess}
        polling={accessPollInFlight}
        onRetry={retryAccessCheck}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="app-shell">
      <AppHeaderMenu
        menuPanelRef={menuPanelRef}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        user={user}
        accessState={accessState}
        checkingAccess={checkingAccess}
        pin={pin}
        pinSyncState={pinSyncState}
        onPinChange={setPin}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        manualCompletedCandidates={manualCompletedCandidates}
        manualCompletedItemId={manualCompletedItemId}
        onManualCompletedItemIdChange={setManualCompletedItemId}
        onAddToCompleted={handleAddToCompleted}
        updatingItemId={updatingItemId}
        allServiceItems={allServiceItems}
        timeOverrideItemId={timeOverrideItemId}
        onTimeOverrideSelectionChange={handleTimeOverrideSelectionChange}
        timeOverrideValue={timeOverrideValue}
        onTimeOverrideValueChange={setTimeOverrideValue}
        hasMenuTimeOverrideInput={hasMenuTimeOverrideInput}
        isMenuTimeOverrideValid={isMenuTimeOverrideValid}
        selectedTimeOverrideItem={selectedTimeOverrideItem}
        onSaveTimeOverride={handleSaveTimeOverride}
        canResetSelectedTimeOverride={canResetSelectedTimeOverride}
        onResetTimeOverride={handleResetTimeOverride}
        selectedDate={selectedDate}
        onOpenActivityPopup={handleOpenActivityPopup}
        activityEntriesCount={activityEntries.length}
        loadingActivity={loadingActivity}
        statusLine={statusLine}
      />

      <DateNavigator date={selectedDate} onDateChange={setSelectedDate} onManualRefresh={manualRefresh} loading={loadingServices} />

      {accessState === 'firebase_missing' ? <p className="error-banner">Configuração Firebase em falta. Preenche as variáveis `VITE_FIREBASE_*`.</p> : null}

      {staleWarning ? <p className="warning-banner">{staleWarning}</p> : null}

      {errorMessage || accessErrorMessage || pinSyncErrorMessage || serviceDataErrorMessage || dateCollectionsErrorMessage ? (
        <p className="error-banner">
          {errorMessage || accessErrorMessage || pinSyncErrorMessage || serviceDataErrorMessage || dateCollectionsErrorMessage}
        </p>
      ) : null}

      {paneLoading ? (
        <ServiceWorkspaceLoadingFallback />
      ) : canReadServiceData ? (
        <Suspense fallback={<ServiceWorkspaceLoadingFallback />}>
          <ServiceWorkspace
            serviceData={serviceDataWithOverrides}
            statusMap={statusMap}
            readyMap={readyMap}
            onToggleDone={handleToggleDone}
            onToggleReady={handleToggleReady}
            onSaveTimeOverride={handleSaveItemTimeOverride}
            updatingItemId={updatingItemId}
            disabled={accessState !== 'allowed'}
            loading={paneLoading}
            canShowEmptyState={canReadServiceData && hasDayResponse}
            lockedMessage=""
          />
        </Suspense>
      ) : (
        <ServiceWorkspaceLocked lockedMessage={lockedListMessage} />
      )}

      {activityPopupOpen ? (
        <ActivityPopup
          selectedDate={selectedDate}
          loadingActivity={loadingActivity}
          activityEntries={activityEntries}
          activityTimeFormatter={activityTimeFormatter}
          onClose={handleCloseActivityPopup}
        />
      ) : null}
    </div>
  );
}

export default App;
