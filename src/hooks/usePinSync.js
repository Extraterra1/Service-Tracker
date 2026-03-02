import { useEffect, useRef, useState } from 'react';

let pinStoreModulePromise;

function loadPinStoreModule() {
  pinStoreModulePromise ??= import('../lib/pinStore');
  return pinStoreModulePromise;
}

export function usePinSync({ accessState, user, pin, setPin }) {
  const [pinSyncState, setPinSyncState] = useState('idle');
  const [error, setError] = useState('');

  const cloudPinRef = useRef('');
  const latestPinRef = useRef(pin);
  const hasLoadedCloudPinRef = useRef(false);
  const applyingCloudPinRef = useRef(false);

  useEffect(() => {
    latestPinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    cloudPinRef.current = '';
    hasLoadedCloudPinRef.current = false;

    let isActive = true;
    let unsubscribe = () => {};

    if (accessState !== 'allowed' || !user?.uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinSyncState('idle');
      setError('');
      return () => {};
    }

    Promise.resolve().then(() => {
      if (isActive) {
        setPinSyncState('syncing');
      }
    });

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
              void saveUserPin(user.uid, latestPinRef.current).catch((nextError) => {
                if (!isActive) {
                  return;
                }
                setPinSyncState('error');
                setError(nextError.message);
              });
            }

            setError('');
            setPinSyncState('synced');
          },
          (nextError) => {
            if (!isActive) {
              return;
            }
            setPinSyncState('error');
            setError(nextError.message);
          }
        );
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }
        setPinSyncState('error');
        setError(nextError.message);
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [accessState, setPin, user?.uid]);

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPinSyncState('syncing');
    void loadPinStoreModule()
      .then(({ saveUserPin }) => saveUserPin(user.uid, pin))
      .then(() => {
        if (!isActive) {
          return;
        }
        cloudPinRef.current = pin;
        setError('');
        setPinSyncState('synced');
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }
        setPinSyncState('error');
        setError(nextError.message);
      });

    return () => {
      isActive = false;
    };
  }, [accessState, pin, user?.uid]);

  return {
    pinSyncState,
    error
  };
}
