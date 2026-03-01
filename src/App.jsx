import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import './App.css';
import AuthPanel from './components/AuthPanel';
import AccessGateScreen from './components/AccessGateScreen';
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

function getMenuItemLabel(item) {
  const serviceLabel = item.serviceType === 'return' ? 'Recolha' : 'Entrega';
  const itemName = item.name || item.id || item.itemId;
  const displayTime = item.overrideTime || item.displayTime || item.time || '--:--';
  return `${displayTime} - ${serviceLabel} - ${itemName}`;
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

  const handleManualRefresh = useCallback(() => {
    manualRefresh();
  }, [manualRefresh]);

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

  const showAuthResolvingScreen = checkingAccess && accessState === 'checking';
  const showSignedOutLanding = !checkingAccess && accessState === 'signed_out';
  const showAccessGateScreen = !checkingAccess && (accessState === 'pending' || accessState === 'denied' || accessState === 'blocked');

  if (showAuthResolvingScreen) {
    return (
      <main className="auth-resolving-screen" aria-busy="true" aria-label="A validar sessão">
        <div className="auth-resolving-card">
          <span className="auth-resolving-spinner" aria-hidden="true" />
          <p>A validar sessão...</p>
        </div>
      </main>
    );
  }

  if (showSignedOutLanding) {
    return <SignedOutLanding onSignIn={handleSignIn} errorMessage={errorMessage || accessErrorMessage} />;
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
      <header className="app-header app-header-compact">
        <div className="title-block">
          <p className="eyebrow">JustDrive</p>
          <h1>Lista de Serviço</h1>
        </div>

        <details ref={menuPanelRef} className="menu-panel">
          <summary className="ghost-btn menu-summary">Menu</summary>
          <div className="menu-content">
            <div className="menu-head">
              <div className="menu-head-copy">
                <p className="menu-title">Operação diária</p>
                <p className="subtle-text">Definições rápidas para a operação de hoje.</p>
              </div>
              <button
                type="button"
                className="theme-icon-btn"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {theme === 'dark' ? <SunMedium className="theme-icon" aria-hidden="true" /> : <MoonStar className="theme-icon" aria-hidden="true" />}
              </button>
            </div>

            <div className="menu-sections">
              <details className="menu-section" open>
                <summary className="menu-section-summary">Conta e PIN</summary>
                <div className="menu-section-body">
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
                </div>
              </details>

              <details className="menu-section">
                <summary className="menu-section-summary">Completados</summary>
                <div className="menu-section-body">
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
              </details>

              <details className="menu-section">
                <summary className="menu-section-summary">Alterar Hora</summary>
                <div className="menu-section-body">
                  <p className="subtle-text">Define uma hora manual.</p>
                  <div className="menu-time-controls">
                    <select
                      className="manual-completed-select"
                      value={timeOverrideItemId}
                      onChange={(event) => handleTimeOverrideSelectionChange(event.target.value)}
                      disabled={allServiceItems.length === 0 || updatingItemId !== ''}
                    >
                      {allServiceItems.length === 0 ? <option value="">Sem serviços disponíveis</option> : null}
                      {allServiceItems.map((item) => (
                        <option key={item.itemId} value={item.itemId}>
                          {getMenuItemLabel(item)}
                        </option>
                      ))}
                    </select>

                    <div className="menu-time-row">
                      <input
                        type="text"
                        inputMode="text"
                        placeholder="HH:mm"
                        pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                        maxLength={5}
                        className="menu-time-input"
                        value={timeOverrideValue}
                        onChange={(event) => setTimeOverrideValue(event.target.value)}
                        disabled={!selectedTimeOverrideItem || updatingItemId !== ''}
                        aria-label="Hora manual no formato 24 horas"
                      />
                      <button
                        type="button"
                        className="ghost-btn compact-btn"
                        onClick={handleSaveTimeOverride}
                        disabled={!selectedTimeOverrideItem || !hasMenuTimeOverrideInput || !isMenuTimeOverrideValid || updatingItemId !== ''}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="ghost-btn compact-btn"
                        onClick={handleResetTimeOverride}
                        disabled={!canResetSelectedTimeOverride || updatingItemId !== ''}
                      >
                        Reset
                      </button>
                    </div>
                    {hasMenuTimeOverrideInput && !isMenuTimeOverrideValid ? <p className="helper-text">Formato inválido. Usa HH:mm.</p> : null}
                  </div>
                </div>
              </details>

              <details className="menu-section">
                <summary className="menu-section-summary">Atividade do Dia</summary>
                <div className="menu-section-body">
                  <p className="subtle-text">Histórico de hora, pronto/não pronto e concluídos em {selectedDate}.</p>
                  <button type="button" className="ghost-btn compact-btn menu-activity-open-btn" onClick={handleOpenActivityPopup}>
                    Ver atividade ({activityEntries.length})
                  </button>
                  {loadingActivity ? <p className="helper-text">A carregar atividade...</p> : null}
                </div>
              </details>
            </div>
            <p className="menu-sync-footnote">{statusLine}</p>
          </div>
        </details>
      </header>

      <DateNavigator date={selectedDate} onDateChange={setSelectedDate} onManualRefresh={handleManualRefresh} loading={loadingServices} />

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
        <div
          className="activity-popup-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseActivityPopup();
            }
          }}
        >
          <section className="activity-popup" role="dialog" aria-modal="true" aria-label="Atividade do dia">
            <header className="activity-popup-header">
              <div>
                <p className="activity-popup-kicker">Atividade do Dia</p>
                <h3>{selectedDate}</h3>
              </div>
              <button type="button" className="activity-popup-close" onClick={handleCloseActivityPopup} aria-label="Fechar atividade">
                ✕
              </button>
            </header>

            {loadingActivity ? (
              <p className="helper-text">A carregar atividade...</p>
            ) : activityEntries.length === 0 ? (
              <p className="helper-text">Sem atividade registada para este dia.</p>
            ) : (
              <ul className="activity-popup-list">
                {activityEntries.map((entry) => {
                  const actionTime = toDateValue(entry.createdAt);
                  const actionTimeLabel = actionTime ? activityTimeFormatter.format(actionTime) : '--/-- --:--';
                  const updatedBy = entry.updatedByName || entry.updatedByEmail || 'Equipa';
                  const serviceLabel = entry.serviceType === 'return' ? 'Recolha' : 'Entrega';
                  const itemLabel = entry.itemName || `Serviço ${entry.itemId}`;
                  const reservationLabel = entry.reservationId ? `#${entry.reservationId}` : `#${entry.itemId}`;
                  const isTimeChange = entry.actionType === 'time_change';
                  const isReadyToggle = entry.actionType === 'ready_toggle';
                  const actionLabel = isTimeChange
                    ? 'alterou hora'
                    : isReadyToggle
                      ? entry.ready
                        ? 'viatura pronta'
                        : 'viatura não pronta'
                      : entry.done
                        ? 'fez'
                        : 'desfez';
                  const oldTimeLabel = entry.oldTime || '--:--';
                  const newTimeLabel = entry.newTime || entry.itemTime || '--:--';
                  const plateLabel = entry.plate || 'Sem matrícula';
                  const actionClass = isTimeChange
                    ? 'is-time'
                    : isReadyToggle
                      ? entry.ready
                        ? 'is-ready-on'
                        : 'is-ready-off'
                      : entry.done
                        ? 'is-done'
                        : 'is-undone';

                  return (
                    <li key={`popup-activity-${entry.id}`} className="activity-popup-item">
                      <p className="activity-popup-main">
                        <strong>{updatedBy}</strong> <span className={`menu-activity-action ${actionClass}`}>{actionLabel}</span> {serviceLabel}
                      </p>
                      {isTimeChange ? (
                        <p className="activity-popup-meta">
                          {itemLabel} · {reservationLabel} · {oldTimeLabel} → {newTimeLabel} · {actionTimeLabel}
                        </p>
                      ) : isReadyToggle ? (
                        <p className="activity-popup-meta">
                          {itemLabel} · {reservationLabel} · {plateLabel} · {actionTimeLabel}
                        </p>
                      ) : (
                        <p className="activity-popup-meta">
                          {itemLabel} · {reservationLabel} · {entry.itemTime || '--:--'} · {actionTimeLabel}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default App;
