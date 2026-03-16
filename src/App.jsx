import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';
import AccessGateScreen from './components/AccessGateScreen';
import ActivityPopup from './components/ActivityPopup';
import AppHeaderMenu from './components/AppHeaderMenu';
import CarHistoryPopup from './components/CarHistoryPopup';
import DateNavigator from './components/DateNavigator';
import LeaderboardPopup from './components/LeaderboardPopup';
import SignedOutLanding from './components/SignedOutLanding';
import { signInWithGoogle, signOutUser } from './lib/auth';
import { CURRENT_DAY_ONLY_MUTATION_ERROR, getTodayDate, isCurrentServiceDate } from './lib/date';
import { canNavigateLeaderboardPeriodForward, getLeaderboardPeriodWindow, shiftLeaderboardAnchor } from './lib/leaderboardPeriods';
import {
  collectServiceWorkerDiagnostics,
  collectStorageDiagnostics,
  copySessionDiagnosticsToClipboard,
  getDisplayModeSnapshot,
  sessionDiagnostics
} from './lib/sessionDiagnostics';
import { normalizePlate } from './lib/plates';
import { useAccessGate } from './hooks/useAccessGate';
import { useActivityEntries } from './hooks/useActivityEntries';
import { useCarHistory } from './hooks/useCarHistory';
import { useDateCollections } from './hooks/useDateCollections';
import { useLeaderboardData } from './hooks/useLeaderboardData';
import { usePinSync } from './hooks/usePinSync';
import { useServiceDayData } from './hooks/useServiceDayData';
import { toDateValue } from './lib/timestamp';

const ServiceWorkspace = lazy(() => import('./features/service-workspace/ServiceWorkspace'));

const PIN_STORAGE_KEY = 'service_tracker_api_pin';
const THEME_STORAGE_KEY = 'service_tracker_theme';
const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000;
const DIAGNOSTICS_STATUS_HIDE_AFTER_MS = 6 * 1000;

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
  const [updatingItemId, setUpdatingItemId] = useState('');
  const [manualCompletedItemId, setManualCompletedItemId] = useState('');
  const [timeOverrideItemId, setTimeOverrideItemId] = useState('');
  const [timeOverrideValue, setTimeOverrideValue] = useState('');
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [carHistoryPopupOpen, setCarHistoryPopupOpen] = useState(false);
  const [leaderboardPopupOpen, setLeaderboardPopupOpen] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');
  const [leaderboardAnchors, setLeaderboardAnchors] = useState(() => ({
    weekly: new Date(),
    monthly: new Date(),
  }));
  const [carHistoryInitialPlateKey, setCarHistoryInitialPlateKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [diagnosticsStatusMessage, setDiagnosticsStatusMessage] = useState('');
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
  const {
    pinSyncState,
    error: pinSyncErrorMessage,
    resync: resyncPin
  } = usePinSync({
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
    pin,
    userUid: user?.uid ?? ''
  });
  const {
    statusMap,
    timeOverrideMap,
    readyMap,
    error: dateCollectionsErrorMessage
  } = useDateCollections({
    canReadServiceData,
    selectedDate
  });
  const {
    activityEntries,
    loadingActivity,
    error: activityErrorMessage
  } = useActivityEntries({
    enabled: activityPopupOpen && canReadServiceData,
    selectedDate
  });
  const {
    plateOptions: carHistoryPlateOptions,
    entriesByPlate: carHistoryEntriesByPlate,
    rangeStart: carHistoryRangeStart,
    rangeEnd: carHistoryRangeEnd,
    loading: loadingCarHistory,
    error: carHistoryErrorMessage,
    loadCarHistory,
    resetCarHistory
  } = useCarHistory({
    accessState
  });
  const {
    data: leaderboardData,
    loading: leaderboardLoading,
    error: leaderboardError,
    lastLoadedAt: leaderboardLastLoadedAt,
    loadLeaderboard,
    resetLeaderboard
  } = useLeaderboardData({
    accessState
  });

  const menuPanelRef = useRef(null);
  const lastSyncedProfileRef = useRef('');
  const diagnosticsStatusTimeoutRef = useRef(0);
  const leaderboardAnchor = leaderboardAnchors[leaderboardPeriod] ?? new Date();
  const leaderboardWindow = useMemo(
    () => getLeaderboardPeriodWindow(leaderboardPeriod, leaderboardAnchor),
    [leaderboardAnchor, leaderboardPeriod]
  );
  const canNavigateLeaderboardForward = useMemo(
    () => canNavigateLeaderboardPeriodForward(leaderboardPeriod, leaderboardAnchor),
    [leaderboardAnchor, leaderboardPeriod]
  );

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

  useEffect(
    () => () => {
      if (diagnosticsStatusTimeoutRef.current) {
        window.clearTimeout(diagnosticsStatusTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const displayModeSnapshot = getDisplayModeSnapshot();
    const previousStorageStatus = sessionDiagnostics.getReport().storage;

    sessionDiagnostics.recordAppBoot({
      ...displayModeSnapshot
    });

    const handlePageShow = (event) => {
      sessionDiagnostics.recordEvent('page_show', {
        persisted: Boolean(event.persisted)
      });
    };
    const handlePageHide = (event) => {
      sessionDiagnostics.recordEvent('page_hide', {
        persisted: Boolean(event.persisted)
      });
    };
    const handleVisibilityChange = () => {
      sessionDiagnostics.recordEvent('visibility_change', {
        visibilityState: String(document.visibilityState ?? 'unknown')
      });
    };
    const handleOnline = () => {
      sessionDiagnostics.recordEvent('network_online', {});
    };
    const handleOffline = () => {
      sessionDiagnostics.recordEvent('network_offline', {});
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void collectStorageDiagnostics({
      isStandalone: displayModeSnapshot.isStandalone,
      allowPersistAttempt: !previousStorageStatus?.persistAttempted
    })
      .then((storageStatus) => {
        sessionDiagnostics.recordStorageStatus(storageStatus);
      })
      .catch((error) => {
        sessionDiagnostics.recordError('storage_status_error', error);
      });

    void collectServiceWorkerDiagnostics()
      .then((serviceWorkerStatus) => {
        sessionDiagnostics.recordServiceWorkerStatus(serviceWorkerStatus);
      })
      .catch((error) => {
        sessionDiagnostics.recordError('service_worker_status_error', error);
      });

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showDiagnosticsStatus = useCallback((message) => {
    setDiagnosticsStatusMessage(message);

    if (diagnosticsStatusTimeoutRef.current) {
      window.clearTimeout(diagnosticsStatusTimeoutRef.current);
    }

    diagnosticsStatusTimeoutRef.current = window.setTimeout(() => {
      setDiagnosticsStatusMessage('');
      diagnosticsStatusTimeoutRef.current = 0;
    }, DIAGNOSTICS_STATUS_HIDE_AFTER_MS);
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
    if (!canReadServiceData) {
      return () => {};
    }

    const handleWindowFocus = () => {
      void resyncPin();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [canReadServiceData, resyncPin]);

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
  const canMutateSelectedDate = isCurrentServiceDate(selectedDate);
  const serviceWorkspaceReadOnly = accessState !== 'allowed' || !canMutateSelectedDate;
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
  const activityPlateByItemId = useMemo(
    () =>
      allServiceItems.reduce((lookup, item) => {
        const itemId = String(item?.itemId ?? '').trim();
        const plate = String(item?.plate ?? '').trim();
        if (!itemId || !plate || lookup[itemId]) {
          return lookup;
        }

        lookup[itemId] = plate;
        return lookup;
      }, {}),
    [allServiceItems]
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
      setCarHistoryPopupOpen(false);
      setLeaderboardPopupOpen(false);
      resetCarHistory();
      resetLeaderboard();
    }
  }, [canReadServiceData, resetCarHistory, resetLeaderboard]);

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
    sessionDiagnostics.markExplicitSignOutStart();
    try {
      await signOutUser();
    } catch (error) {
      sessionDiagnostics.clearExplicitSignOutStart('sign_out_failed');
      setErrorMessage(error.message);
    } finally {
      setActivityPopupOpen(false);
      setCarHistoryPopupOpen(false);
      setTimeOverrideItemId('');
      setTimeOverrideValue('');
    }
  };

  const handleCopySessionDiagnostics = useCallback(async () => {
    try {
      await copySessionDiagnosticsToClipboard();
      showDiagnosticsStatus('Diagnóstico copiado. Envia este texto à equipa.');
    } catch (error) {
      sessionDiagnostics.recordError('diagnostics_copy_failed', error);
      showDiagnosticsStatus('Não foi possível copiar o diagnóstico. Tenta novamente.');
    }
  }, [showDiagnosticsStatus]);

  const handleToggleDone = useCallback(
    async (item, done) => {
      if (accessState !== 'allowed') {
        return;
      }

      if (!canMutateSelectedDate) {
        setErrorMessage(CURRENT_DAY_ONLY_MUTATION_ERROR);
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
    [accessState, canMutateSelectedDate, selectedDate, updatingItemId, user]
  );

  const handleToggleReady = useCallback(
    async (item) => {
      if (accessState !== 'allowed') {
        return;
      }

      if (item?.serviceType !== 'pickup') {
        return;
      }

      if (!canMutateSelectedDate) {
        setErrorMessage(CURRENT_DAY_ONLY_MUTATION_ERROR);
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
    [accessState, canMutateSelectedDate, readyMap, selectedDate, updatingItemId, user]
  );

  const handleAddToCompleted = useCallback(async () => {
    if (accessState !== 'allowed') {
      return;
    }

    if (!canMutateSelectedDate) {
      setErrorMessage(CURRENT_DAY_ONLY_MUTATION_ERROR);
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
  }, [accessState, canMutateSelectedDate, manualCompletedCandidates, manualCompletedItemId, selectedDate, updatingItemId, user]);

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

      if (!canMutateSelectedDate) {
        setErrorMessage(CURRENT_DAY_ONLY_MUTATION_ERROR);
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
    [accessState, canMutateSelectedDate, selectedDate, timeOverrideItemId, updatingItemId, user]
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

  const handleOpenCarHistoryPopup = useCallback((initialPlate = '') => {
    const nextPlateKey = normalizePlate(initialPlate);

    menuPanelRef.current?.removeAttribute('open');
    setCarHistoryInitialPlateKey(nextPlateKey);
    setCarHistoryPopupOpen(true);
    void loadCarHistory();
  }, [loadCarHistory]);

  const handleOpenCarHistoryFromModel = useCallback(
    (plate) => {
      handleOpenCarHistoryPopup(plate);
    },
    [handleOpenCarHistoryPopup]
  );

  const handleCloseCarHistoryPopup = useCallback(() => {
    setCarHistoryPopupOpen(false);
  }, []);

  const handleOpenLeaderboardPopup = useCallback(() => {
    menuPanelRef.current?.removeAttribute('open');
    setLeaderboardPopupOpen(true);
    if (leaderboardPeriod === 'all_time') {
      void loadLeaderboard({ period: 'all_time' });
      return;
    }

    void loadLeaderboard({
      period: leaderboardPeriod,
      now: leaderboardAnchor,
    });
  }, [leaderboardAnchor, leaderboardPeriod, loadLeaderboard]);

  const handleCloseLeaderboardPopup = useCallback(() => {
    setLeaderboardPopupOpen(false);
  }, []);

  const handleLeaderboardPeriodChange = useCallback(
    (nextPeriod) => {
      if (nextPeriod === leaderboardPeriod) {
        return;
      }

      setLeaderboardPeriod(nextPeriod);
      if (nextPeriod === 'all_time') {
        void loadLeaderboard({ period: 'all_time' });
        return;
      }

      const nextAnchor = new Date();
      setLeaderboardAnchors((current) => ({
        ...current,
        [nextPeriod]: nextAnchor,
      }));
      void loadLeaderboard({
        period: nextPeriod,
        now: nextAnchor,
      });
    },
    [leaderboardPeriod, loadLeaderboard]
  );

  const handleLeaderboardPeriodNavigate = useCallback(
    (direction) => {
      if (leaderboardPeriod !== 'weekly' && leaderboardPeriod !== 'monthly') {
        return;
      }

      if (direction !== 'previous' && direction !== 'next') {
        return;
      }

      if (direction === 'next' && !canNavigateLeaderboardForward) {
        return;
      }

      const delta = direction === 'previous' ? -1 : 1;
      const nextAnchor = shiftLeaderboardAnchor(leaderboardPeriod, leaderboardAnchor, delta);

      setLeaderboardAnchors((current) => ({
        ...current,
        [leaderboardPeriod]: nextAnchor,
      }));
      void loadLeaderboard({
        period: leaderboardPeriod,
        now: nextAnchor,
      });
    },
    [canNavigateLeaderboardForward, leaderboardAnchor, leaderboardPeriod, loadLeaderboard]
  );

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
    return (
      <SignedOutLanding
        onSignIn={handleSignIn}
        errorMessage={errorMessage || accessErrorMessage}
        signInDisabled={checkingAccess}
      />
    );
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
        onOpenAccountSection={() => {
          void resyncPin();
        }}
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
        onOpenCarHistoryPopup={handleOpenCarHistoryPopup}
        onOpenLeaderboardPopup={handleOpenLeaderboardPopup}
        onCopySessionDiagnostics={handleCopySessionDiagnostics}
        diagnosticsStatusMessage={diagnosticsStatusMessage}
        leaderboardLoading={leaderboardLoading}
        statusLine={statusLine}
        canMutateSelectedDate={canMutateSelectedDate}
      />

      <DateNavigator date={selectedDate} onDateChange={setSelectedDate} onManualRefresh={manualRefresh} loading={loadingServices} />

      {accessState === 'firebase_missing' ? <p className="error-banner">Configuração Firebase em falta. Preenche as variáveis `VITE_FIREBASE_*`.</p> : null}

      {staleWarning ? <p className="warning-banner">{staleWarning}</p> : null}

      {errorMessage || accessErrorMessage || pinSyncErrorMessage || serviceDataErrorMessage || dateCollectionsErrorMessage || activityErrorMessage ? (
        <p className="error-banner">
          {errorMessage || accessErrorMessage || pinSyncErrorMessage || serviceDataErrorMessage || dateCollectionsErrorMessage || activityErrorMessage}
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
            onOpenCarHistoryFromModel={handleOpenCarHistoryFromModel}
            updatingItemId={updatingItemId}
            disabled={serviceWorkspaceReadOnly}
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
          plateByItemId={activityPlateByItemId}
          activityTimeFormatter={activityTimeFormatter}
          onClose={handleCloseActivityPopup}
        />
      ) : null}

      {carHistoryPopupOpen ? (
        <CarHistoryPopup
          loading={loadingCarHistory}
          error={carHistoryErrorMessage}
          plateOptions={carHistoryPlateOptions}
          entriesByPlate={carHistoryEntriesByPlate}
          rangeStart={carHistoryRangeStart}
          rangeEnd={carHistoryRangeEnd}
          initialPlateKey={carHistoryInitialPlateKey}
          onApplyDateRange={loadCarHistory}
          onClose={handleCloseCarHistoryPopup}
        />
      ) : null}

      {leaderboardPopupOpen ? (
        <LeaderboardPopup
          period={leaderboardPeriod}
          data={leaderboardData}
          lastLoadedAt={leaderboardLastLoadedAt}
          loading={leaderboardLoading}
          errorMessage={leaderboardError}
          periodWindowLabel={leaderboardWindow.windowLabel}
          canNavigateForward={canNavigateLeaderboardForward}
          onClose={handleCloseLeaderboardPopup}
          onPeriodChange={handleLeaderboardPeriodChange}
          onNavigatePeriod={handleLeaderboardPeriodNavigate}
        />
      ) : null}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
