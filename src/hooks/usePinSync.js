import { useCallback, useEffect, useRef, useState } from 'react';

const PIN_SAVE_DEBOUNCE_MS = 400;

let pinStoreModulePromise;

function loadPinStoreModule() {
  pinStoreModulePromise ??= import('../lib/pinStore');
  return pinStoreModulePromise;
}

function normalizePin(value) {
  return String(value ?? '')
    .replace(/[^0-9]/g, '')
    .slice(0, 4);
}

export function usePinSync({ accessState, user, pin, setPin }) {
  const [pinSyncState, setPinSyncState] = useState('idle');
  const [error, setError] = useState('');

  const cloudPinRef = useRef('');
  const latestPinRef = useRef(normalizePin(pin));
  const hasLoadedCloudPinRef = useRef(false);
  const applyingCloudPinRef = useRef(false);
  const writeTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    latestPinRef.current = normalizePin(pin);
  }, [pin]);

  const clearPendingWrite = useCallback(() => {
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
  }, []);

  const persistPin = useCallback(async (uid, nextPin, requestId) => {
    const { saveUserPin } = await loadPinStoreModule();
    await saveUserPin(uid, nextPin);

    if (requestIdRef.current !== requestId) {
      return false;
    }

    cloudPinRef.current = nextPin;
    return true;
  }, []);

  const flushPendingWrite = useCallback(async () => {
    if (writeTimerRef.current === null) {
      return false;
    }

    clearPendingWrite();

    if (accessState !== 'allowed' || !user?.uid || !hasLoadedCloudPinRef.current) {
      return false;
    }

    const nextPin = normalizePin(latestPinRef.current);
    if (nextPin === cloudPinRef.current) {
      return false;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setPinSyncState('syncing');
    setError('');

    try {
      const didPersist = await persistPin(user.uid, nextPin, requestId);
      if (!didPersist) {
        return true;
      }

      setPinSyncState('synced');
    } catch (nextError) {
      if (requestIdRef.current !== requestId) {
        return true;
      }

      setPinSyncState('error');
      setError(nextError.message);
    }

    return true;
  }, [accessState, clearPendingWrite, persistPin, user?.uid]);

  const resync = useCallback(async () => {
    if (accessState !== 'allowed' || !user?.uid) {
      clearPendingWrite();
      hasLoadedCloudPinRef.current = false;
      cloudPinRef.current = '';
      setPinSyncState('idle');
      setError('');
      return;
    }

    const flushedWrite = await flushPendingWrite();
    if (flushedWrite) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setPinSyncState('syncing');
    setError('');

    try {
      const { readUserPin, saveUserPin } = await loadPinStoreModule();
      const cloudPin = normalizePin(await readUserPin(user.uid));

      if (requestIdRef.current !== requestId) {
        return;
      }

      hasLoadedCloudPinRef.current = true;
      cloudPinRef.current = cloudPin;

      const localPin = normalizePin(latestPinRef.current);

      if (cloudPin && cloudPin !== localPin) {
        applyingCloudPinRef.current = true;
        setPin(cloudPin);
      } else if (!cloudPin && localPin) {
        await saveUserPin(user.uid, localPin);

        if (requestIdRef.current !== requestId) {
          return;
        }

        cloudPinRef.current = localPin;
      }

      setPinSyncState('synced');
    } catch (nextError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setPinSyncState('error');
      setError(nextError.message);
    }
  }, [accessState, clearPendingWrite, flushPendingWrite, setPin, user?.uid]);

  useEffect(() => {
    cloudPinRef.current = '';
    hasLoadedCloudPinRef.current = false;
    applyingCloudPinRef.current = false;

    if (accessState !== 'allowed' || !user?.uid) {
      clearPendingWrite();
      setPinSyncState('idle');
      setError('');
      return () => {};
    }

    void resync();

    return () => {
      requestIdRef.current += 1;
      clearPendingWrite();
    };
  }, [accessState, clearPendingWrite, resync, user?.uid]);

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

    const normalizedPin = normalizePin(pin);
    if (normalizedPin === cloudPinRef.current) {
      return;
    }

    const timerId = window.setTimeout(() => {
      writeTimerRef.current = null;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setPinSyncState('syncing');
      setError('');

      void persistPin(user.uid, normalizedPin, requestId)
        .then((didPersist) => {
          if (!didPersist || requestIdRef.current !== requestId) {
            return;
          }

          setPinSyncState('synced');
        })
        .catch((nextError) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          setPinSyncState('error');
          setError(nextError.message);
        });
    }, PIN_SAVE_DEBOUNCE_MS);

    writeTimerRef.current = timerId;

    return () => {
      if (writeTimerRef.current === timerId) {
        window.clearTimeout(timerId);
        writeTimerRef.current = null;
        return;
      }

      window.clearTimeout(timerId);
    };
  }, [accessState, pin, persistPin, user?.uid]);

  return {
    pinSyncState,
    error,
    resync
  };
}
