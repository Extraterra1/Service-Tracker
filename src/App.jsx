import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AuthPanel from './components/AuthPanel';
import DateNavigator from './components/DateNavigator';
import { configureAuthPersistence, signInWithGoogle, signOutUser, subscribeToAuthChanges } from './lib/auth';
import { getTodayDate } from './lib/date';
import { hasFirebaseConfig } from './lib/firebaseApp';

const ServiceWorkspace = lazy(() => import('./features/service-workspace/ServiceWorkspace'));

const PIN_STORAGE_KEY = 'service_tracker_api_pin';
const THEME_STORAGE_KEY = 'service_tracker_theme';
const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000;

let accessModulePromise;
let pinStoreModulePromise;
let apiModulePromise;
let scrapedDataModulePromise;
let statusStoreModulePromise;
let activityStoreModulePromise;
let timeOverrideStoreModulePromise;

function loadAccessModule() {
  accessModulePromise ??= import('./lib/access');
  return accessModulePromise;
}

function loadPinStoreModule() {
  pinStoreModulePromise ??= import('./lib/pinStore');
  return pinStoreModulePromise;
}

function loadApiModule() {
  apiModulePromise ??= import('./lib/api');
  return apiModulePromise;
}

function loadScrapedDataModule() {
  scrapedDataModulePromise ??= import('./lib/scrapedDataStore');
  return scrapedDataModulePromise;
}

function loadStatusStoreModule() {
  statusStoreModulePromise ??= import('./lib/statusStore');
  return statusStoreModulePromise;
}

function loadActivityStoreModule() {
  activityStoreModulePromise ??= import('./lib/activityStore');
  return activityStoreModulePromise;
}

function loadTimeOverrideStoreModule() {
  timeOverrideStoreModulePromise ??= import('./lib/timeOverrideStore');
  return timeOverrideStoreModulePromise;
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

function toTimestampMs(timestampLike) {
  const parsed = toDateValue(timestampLike);
  return parsed ? parsed.getTime() : 0;
}

function getCacheVersionKey(cachedAt) {
  const cacheDate = toDateValue(cachedAt);
  return cacheDate ? String(cacheDate.getTime()) : 'missing-cachedAt';
}

function getMenuItemLabel(item) {
  const serviceLabel = item.serviceType === 'return' ? 'Recolha' : 'Entrega';
  const itemName = item.name || item.id || item.itemId;
  const displayTime = item.overrideTime || item.displayTime || item.time || '--:--';
  return `${displayTime} - ${serviceLabel} - ${itemName}`;
}

function normalizeStatusEntry(status) {
  return {
    done: status?.done === true,
    updatedAt: status?.updatedAt ?? null,
    updatedByName: status?.updatedByName ?? '',
    updatedByEmail: status?.updatedByEmail ?? ''
  };
}

function isSameStatusEntry(prevStatus, nextStatus) {
  return (
    (prevStatus?.done ?? false) === (nextStatus?.done ?? false) &&
    (prevStatus?.updatedByName ?? '') === (nextStatus?.updatedByName ?? '') &&
    (prevStatus?.updatedByEmail ?? '') === (nextStatus?.updatedByEmail ?? '') &&
    toTimestampMs(prevStatus?.updatedAt) === toTimestampMs(nextStatus?.updatedAt)
  );
}

function applyStatusChanges(previousMap, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return previousMap;
  }

  let nextMap = previousMap;
  let hasChanges = false;

  changes.forEach((change) => {
    const baseMap = hasChanges ? nextMap : previousMap;
    const itemId = String(change?.itemId ?? '').trim();
    if (!itemId) {
      return;
    }

    const isRemoved = change.changeType === 'removed';
    if (isRemoved) {
      if (!Object.prototype.hasOwnProperty.call(baseMap, itemId)) {
        return;
      }

      if (!hasChanges) {
        nextMap = { ...previousMap };
        hasChanges = true;
      }

      delete nextMap[itemId];
      return;
    }

    const normalizedStatus = normalizeStatusEntry(change.status);
    const currentStatus = baseMap[itemId];

    if (isSameStatusEntry(currentStatus, normalizedStatus)) {
      return;
    }

    if (!hasChanges) {
      nextMap = { ...previousMap };
      hasChanges = true;
    }

    nextMap[itemId] = normalizedStatus;
  });

  return hasChanges ? nextMap : previousMap;
}

function normalizeTimeOverrideEntry(override) {
  return {
    overrideTime: String(override?.overrideTime ?? '').trim(),
    originalTime: String(override?.originalTime ?? '').trim(),
    updatedAt: override?.updatedAt ?? null,
    updatedByName: override?.updatedByName ?? '',
    updatedByEmail: override?.updatedByEmail ?? ''
  };
}

function isSameTimeOverrideEntry(previousEntry, nextEntry) {
  return (
    (previousEntry?.overrideTime ?? '') === (nextEntry?.overrideTime ?? '') &&
    (previousEntry?.originalTime ?? '') === (nextEntry?.originalTime ?? '') &&
    (previousEntry?.updatedByName ?? '') === (nextEntry?.updatedByName ?? '') &&
    (previousEntry?.updatedByEmail ?? '') === (nextEntry?.updatedByEmail ?? '') &&
    toTimestampMs(previousEntry?.updatedAt) === toTimestampMs(nextEntry?.updatedAt)
  );
}

function applyTimeOverrideChanges(previousMap, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return previousMap;
  }

  let nextMap = previousMap;
  let hasChanges = false;

  changes.forEach((change) => {
    const baseMap = hasChanges ? nextMap : previousMap;
    const itemId = String(change?.itemId ?? '').trim();
    if (!itemId) {
      return;
    }

    if (change.changeType === 'removed') {
      if (!Object.prototype.hasOwnProperty.call(baseMap, itemId)) {
        return;
      }

      if (!hasChanges) {
        nextMap = { ...previousMap };
        hasChanges = true;
      }

      delete nextMap[itemId];
      return;
    }

    const normalizedEntry = normalizeTimeOverrideEntry(change.override);
    const currentEntry = baseMap[itemId];

    if (isSameTimeOverrideEntry(currentEntry, normalizedEntry)) {
      return;
    }

    if (!hasChanges) {
      nextMap = { ...previousMap };
      hasChanges = true;
    }

    nextMap[itemId] = normalizedEntry;
  });

  return hasChanges ? nextMap : previousMap;
}

function ServiceWorkspaceLoadingFallback() {
  return (
    <main className="service-grid" aria-busy="true">
      {["Entregas", "Recolhas"].map((title) => (
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
      {["Entregas", "Recolhas"].map((title) => (
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
  const [pinSyncState, setPinSyncState] = useState('idle');
  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessState, setAccessState] = useState('signed_out');
  const [serviceData, setServiceData] = useState({ pickups: [], returns: [] });
  const [statusMap, setStatusMap] = useState({});
  const [timeOverrideMap, setTimeOverrideMap] = useState({});
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDateData, setLoadingDateData] = useState(true);
  const [hasDayResponse, setHasDayResponse] = useState(false);
  const [refreshSource, setRefreshSource] = useState('idle');
  const [updatingItemId, setUpdatingItemId] = useState('');
  const [manualCompletedItemId, setManualCompletedItemId] = useState('');
  const [timeOverrideItemId, setTimeOverrideItemId] = useState('');
  const [timeOverrideValue, setTimeOverrideValue] = useState('');
  const [activityEntries, setActivityEntries] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [lastLoadAt, setLastLoadAt] = useState(null);
  const [staleWarning, setStaleWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const cloudPinRef = useRef('');
  const latestPinRef = useRef(pin);
  const hasLoadedCloudPinRef = useRef(false);
  const applyingCloudPinRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const autoRefreshAttemptRef = useRef(new Set());
  const menuPanelRef = useRef(null);
  const allowlistCheckTokenRef = useRef(0);

  useEffect(() => {
    void configureAuthPersistence();
  }, []);

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

    let isActive = true;
    let unsubscribe = () => {};

    if (accessState !== 'allowed' || !user?.uid) {
      setPinSyncState('idle');
      return () => {};
    }

    setPinSyncState('syncing');

    void loadPinStoreModule()
      .then(({ saveUserPin, subscribeToUserPin }) => {
        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToUserPin(
          user.uid,
          (cloudPin) => {
            if (!isActive) {
              return;
            }

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
                if (!isActive) {
                  return;
                }
                setPinSyncState('error');
                setErrorMessage(error.message);
              });
            }

            setPinSyncState('synced');
          },
          (error) => {
            if (!isActive) {
              return;
            }
            setPinSyncState('error');
            setErrorMessage(error.message);
          }
        );
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setPinSyncState('error');
        setErrorMessage(error.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
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

    let isActive = true;

    setPinSyncState('syncing');
    void loadPinStoreModule()
      .then(({ saveUserPin }) => saveUserPin(user.uid, pin))
      .then(() => {
        if (!isActive) {
          return;
        }
        cloudPinRef.current = pin;
        setPinSyncState('synced');
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setPinSyncState('error');
        setErrorMessage(error.message);
      });

    return () => {
      isActive = false;
    };
  }, [accessState, pin, user?.uid]);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setAccessState('firebase_missing');
      setCheckingAccess(false);
      return () => {};
    }

    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      const checkToken = allowlistCheckTokenRef.current + 1;
      allowlistCheckTokenRef.current = checkToken;

      setErrorMessage('');
      setUser(currentUser);

      if (!currentUser) {
        setAccessState('signed_out');
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(true);
      void loadAccessModule()
        .then(({ checkAllowlist }) => checkAllowlist(currentUser.uid))
        .then((accessResult) => {
          if (allowlistCheckTokenRef.current !== checkToken) {
            return;
          }
          setAccessState(accessResult.allowed ? 'allowed' : 'denied');
        })
        .catch((error) => {
          if (allowlistCheckTokenRef.current !== checkToken) {
            return;
          }
          setAccessState('denied');
          setErrorMessage(error.message);
        })
        .finally(() => {
          if (allowlistCheckTokenRef.current === checkToken) {
            setCheckingAccess(false);
          }
        });
    });

    return () => {
      allowlistCheckTokenRef.current += 1;
      unsubscribe();
    };
  }, []);

  const canReadServiceData = accessState === 'allowed';
  const canCallApi = canReadServiceData && Boolean(pin);
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
              hasRenderableData: true
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
              hasRenderableData: false
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
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.message);
        setLoadingDateData(false);
      });

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

    let isActive = true;
    let unsubscribe = () => {};

    setStatusMap({});

    void loadStatusStoreModule()
      .then(({ subscribeToDateStatus }) => {
        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToDateStatus(
          selectedDate,
          (changes) => {
            if (!isActive) {
              return;
            }

            setStatusMap((previousMap) => applyStatusChanges(previousMap, changes));
          },
          (error) => {
            if (!isActive) {
              return;
            }

            setErrorMessage(error.message);
          }
        );
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, selectedDate]);

  useEffect(() => {
    if (!canReadServiceData) {
      setTimeOverrideMap({});
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setTimeOverrideMap({});

    void loadTimeOverrideStoreModule()
      .then(({ subscribeToDateTimeOverrides }) => {
        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToDateTimeOverrides(
          selectedDate,
          (changes) => {
            if (!isActive) {
              return;
            }

            setTimeOverrideMap((previousMap) => applyTimeOverrideChanges(previousMap, changes));
          },
          (error) => {
            if (!isActive) {
              return;
            }

            setErrorMessage(error.message);
          }
        );
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, selectedDate]);

  useEffect(() => {
    if (!canReadServiceData) {
      setActivityEntries([]);
      setLoadingActivity(false);
      setActivityPopupOpen(false);
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setLoadingActivity(true);
    setActivityEntries([]);

    void loadActivityStoreModule()
      .then(({ subscribeToDateActivity }) => {
        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToDateActivity(
          selectedDate,
          (entries) => {
            if (!isActive) {
              return;
            }
            setActivityEntries(entries);
            setLoadingActivity(false);
          },
          (error) => {
            if (!isActive) {
              return;
            }
            setErrorMessage(error.message);
            setLoadingActivity(false);
          }
        );
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error.message);
        setLoadingActivity(false);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
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
    await signOutUser();
    setServiceData({ pickups: [], returns: [] });
    setStatusMap({});
    setTimeOverrideMap({});
    setActivityEntries([]);
    setActivityPopupOpen(false);
    setLoadingActivity(false);
    setTimeOverrideItemId('');
    setTimeOverrideValue('');
    setLastLoadAt(null);
    setHasDayResponse(false);
    setStaleWarning('');
    setLoadingDateData(false);
  };

  const handleToggleDone = useCallback(
    async (item, done) => {
      if (accessState !== 'allowed') {
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
    [accessState, selectedDate, user]
  );

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
  }, [accessState, manualCompletedCandidates, manualCompletedItemId, selectedDate, user]);

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
    [accessState, selectedDate, timeOverrideItemId, user]
  );

  const handleSaveTimeOverride = useCallback(async () => {
    if (!selectedTimeOverrideItem) {
      return;
    }
    await handleSaveItemTimeOverride(selectedTimeOverrideItem, timeOverrideValue);
  }, [handleSaveItemTimeOverride, selectedTimeOverrideItem, timeOverrideValue]);

  const handleManualRefresh = useCallback(() => {
    void refreshServiceDataFromApi({
      date: selectedDate,
      forceRefresh: true,
      source: 'manual',
      hasRenderableData: serviceData.pickups.length + serviceData.returns.length > 0
    });
  }, [refreshServiceDataFromApi, selectedDate, serviceData.pickups.length, serviceData.returns.length]);

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

    return `Cache Firestore: ${formatted}`;
  }, [lastLoadAt, loadingServices, refreshSource]);

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
            <p className="menu-title">Operação diária</p>
            <p className="subtle-text">Conta, PIN e estado de sincronização.</p>
            <label className="theme-toggle" htmlFor="theme-switch">
              <input id="theme-switch" type="checkbox" checked={theme === 'dark'} onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')} />
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

            <div className="menu-time-panel">
              <p className="menu-subtitle">Alterar Hora</p>
              <p className="subtle-text">Define uma hora manual sem alterar o valor original em `scraped-data`.</p>
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
                    type="time"
                    className="menu-time-input"
                    value={timeOverrideValue}
                    onChange={(event) => setTimeOverrideValue(event.target.value)}
                    disabled={!selectedTimeOverrideItem || updatingItemId !== ''}
                  />
                  <button
                    type="button"
                    className="ghost-btn compact-btn"
                    onClick={handleSaveTimeOverride}
                    disabled={!selectedTimeOverrideItem || !timeOverrideValue || updatingItemId !== ''}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            <div className="menu-activity-panel">
              <p className="menu-subtitle">Atividade do Dia</p>
              <p className="subtle-text">Histórico de feito/desfeito e alterações de hora para {selectedDate}.</p>
              <button type="button" className="ghost-btn compact-btn menu-activity-open-btn" onClick={handleOpenActivityPopup}>
                Ver atividade ({activityEntries.length})
              </button>
              {loadingActivity ? <p className="helper-text">A carregar atividade...</p> : null}
            </div>

            <p className="status-line status-line-menu">{statusLine}</p>
          </div>
        </details>
      </header>

      <DateNavigator date={selectedDate} onDateChange={setSelectedDate} onManualRefresh={handleManualRefresh} loading={loadingServices} />

      {accessState === 'firebase_missing' ? <p className="error-banner">Configuração Firebase em falta. Preenche as variáveis `VITE_FIREBASE_*`.</p> : null}

      {staleWarning ? <p className="warning-banner">{staleWarning}</p> : null}

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      {paneLoading ? (
        <ServiceWorkspaceLoadingFallback />
      ) : canReadServiceData ? (
        <Suspense fallback={<ServiceWorkspaceLoadingFallback />}>
          <ServiceWorkspace
            serviceData={serviceDataWithOverrides}
            statusMap={statusMap}
            onToggleDone={handleToggleDone}
            onSaveTimeOverride={handleSaveItemTimeOverride}
            disabled={accessState !== 'allowed' || updatingItemId !== ''}
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
                  const actionLabel = isTimeChange ? 'alterou hora' : entry.done ? 'fez' : 'desfez';
                  const oldTimeLabel = entry.oldTime || '--:--';
                  const newTimeLabel = entry.newTime || entry.itemTime || '--:--';

                  return (
                    <li key={`popup-activity-${entry.id}`} className="activity-popup-item">
                      <p className="activity-popup-main">
                        <strong>{updatedBy}</strong>{' '}
                        <span className={`menu-activity-action ${isTimeChange ? 'is-time' : entry.done ? 'is-done' : 'is-undone'}`}>
                          {actionLabel}
                        </span>{' '}
                        {serviceLabel}
                      </p>
                      {isTimeChange ? (
                        <p className="activity-popup-meta">
                          {itemLabel} · {reservationLabel} · {oldTimeLabel} → {newTimeLabel} · {actionTimeLabel}
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
