import { useEffect, useState } from 'react';
import { applyReadyChanges, applyStatusChanges, applyTimeOverrideChanges } from '../lib/dateCollectionsMaps';

let statusStoreModulePromise;
let timeOverrideStoreModulePromise;
let readyStoreModulePromise;

function loadStatusStoreModule() {
  statusStoreModulePromise ??= import('../lib/statusStore');
  return statusStoreModulePromise;
}

function loadTimeOverrideStoreModule() {
  timeOverrideStoreModulePromise ??= import('../lib/timeOverrideStore');
  return timeOverrideStoreModulePromise;
}

function loadReadyStoreModule() {
  readyStoreModulePromise ??= import('../lib/readyStore');
  return readyStoreModulePromise;
}

export function useDateCollections({ canReadServiceData, selectedDate }) {
  const [statusMap, setStatusMap] = useState({});
  const [timeOverrideMap, setTimeOverrideMap] = useState({});
  const [readyMap, setReadyMap] = useState({});
  const [errors, setErrors] = useState({
    status: '',
    timeOverride: '',
    ready: ''
  });

  const setStreamError = (key, message) => {
    setErrors((previous) => {
      const nextMessage = String(message ?? '');
      if (previous[key] === nextMessage) {
        return previous;
      }

      return {
        ...previous,
        [key]: nextMessage
      };
    });
  };

  useEffect(() => {
    if (!canReadServiceData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusMap({});
      setStreamError('status', '');
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setStatusMap({});
    setStreamError('status', '');

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

            setStreamError('status', '');
            setStatusMap((previousMap) => applyStatusChanges(previousMap, changes));
          },
          (nextError) => {
            if (!isActive) {
              return;
            }

            setStreamError('status', nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setStreamError('status', nextError.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, selectedDate]);

  useEffect(() => {
    if (!canReadServiceData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeOverrideMap({});
      setStreamError('timeOverride', '');
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setTimeOverrideMap({});
    setStreamError('timeOverride', '');

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

            setStreamError('timeOverride', '');
            setTimeOverrideMap((previousMap) => applyTimeOverrideChanges(previousMap, changes));
          },
          (nextError) => {
            if (!isActive) {
              return;
            }

            setStreamError('timeOverride', nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setStreamError('timeOverride', nextError.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, selectedDate]);

  useEffect(() => {
    if (!canReadServiceData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReadyMap({});
      setStreamError('ready', '');
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setReadyMap({});
    setStreamError('ready', '');

    void loadReadyStoreModule()
      .then(({ subscribeToDateReady }) => {
        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToDateReady(
          selectedDate,
          (changes) => {
            if (!isActive) {
              return;
            }

            setStreamError('ready', '');
            setReadyMap((previousMap) => applyReadyChanges(previousMap, changes));
          },
          (nextError) => {
            if (!isActive) {
              return;
            }

            setStreamError('ready', nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setStreamError('ready', nextError.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, selectedDate]);

  return {
    statusMap,
    timeOverrideMap,
    readyMap,
    error: errors.status || errors.timeOverride || errors.ready
  };
}
