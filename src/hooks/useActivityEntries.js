import { useEffect, useState } from 'react';

let activityStoreModulePromise;

function loadActivityStoreModule() {
  activityStoreModulePromise ??= import('../lib/activityStore');
  return activityStoreModulePromise;
}

export function useActivityEntries({ enabled, selectedDate }) {
  const [activityEntries, setActivityEntries] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setActivityEntries([]);
      setLoadingActivity(false);
      setError('');
      return () => {};
    }

    let isActive = true;
    let unsubscribe = () => {};

    setActivityEntries([]);
    setLoadingActivity(true);
    setError('');

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

            setError('');
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
  }, [enabled, selectedDate]);

  return {
    activityEntries,
    loadingActivity,
    error
  };
}
