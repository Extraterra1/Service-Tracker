import { useEffect, useState } from 'react';
import { applyReadyChanges, applyStatusChanges, applyTimeOverrideChanges } from '../lib/dateCollectionsMaps';

let statusStoreModulePromise;
let activityStoreModulePromise;
let timeOverrideStoreModulePromise;
let readyStoreModulePromise;

function loadStatusStoreModule() {
  statusStoreModulePromise ??= import('../lib/statusStore');
  return statusStoreModulePromise;
}

function loadActivityStoreModule() {
  activityStoreModulePromise ??= import('../lib/activityStore');
  return activityStoreModulePromise;
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
  const [activityEntries, setActivityEntries] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canReadServiceData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          (nextError) => {
            if (!isActive) {
              return;
            }

            setError(nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setError(nextError.message);
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
          (nextError) => {
            if (!isActive) {
              return;
            }

            setError(nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setError(nextError.message);
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
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setReadyMap({});

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

            setReadyMap((previousMap) => applyReadyChanges(previousMap, changes));
          },
          (nextError) => {
            if (!isActive) {
              return;
            }

            setError(nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setError(nextError.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canReadServiceData, selectedDate]);

  useEffect(() => {
    if (!canReadServiceData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivityEntries([]);
      setLoadingActivity(false);
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
          (nextError) => {
            if (!isActive) {
              return;
            }
            setError(nextError.message);
            setLoadingActivity(false);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setError(nextError.message);
        setLoadingActivity(false);
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
    activityEntries,
    loadingActivity,
    error
  };
}
