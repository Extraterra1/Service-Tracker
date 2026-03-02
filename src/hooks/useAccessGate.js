import { useCallback, useEffect, useRef, useState } from 'react';
import { configureAuthPersistence, subscribeToAuthChanges, waitForAuthStateReady } from '../lib/auth';
import { hasFirebaseConfig } from '../lib/firebaseApp';

const ACCESS_POLL_INTERVAL_MS = 20 * 1000;

let accessModulePromise;

function loadAccessModule() {
  accessModulePromise ??= import('../lib/access');
  return accessModulePromise;
}

export function useAccessGate() {
  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessState, setAccessState] = useState('checking');
  const [accessGateMessage, setAccessGateMessage] = useState('');
  const [accessPollInFlight, setAccessPollInFlight] = useState(false);
  const [error, setError] = useState('');

  const allowlistCheckTokenRef = useRef(0);
  const accessPollInFlightRef = useRef(false);

  const applyAccessResult = useCallback((accessResult) => {
    const nextState = String(accessResult?.state ?? 'denied');
    setAccessState(nextState);

    if (nextState === 'allowed' || nextState === 'signed_out' || nextState === 'checking') {
      setAccessGateMessage('');
      return;
    }

    setAccessGateMessage(String(accessResult?.message ?? '').trim());
  }, []);

  const setAccessPollingState = useCallback((value) => {
    accessPollInFlightRef.current = value;
    setAccessPollInFlight(value);
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setAccessState('firebase_missing');
      setAccessGateMessage('');
      setCheckingAccess(false);
      return () => {};
    }

    let isMounted = true;
    let unsubscribe = () => {};

    const handleCurrentUser = (currentUser) => {
      const checkToken = allowlistCheckTokenRef.current + 1;
      allowlistCheckTokenRef.current = checkToken;

      setError('');
      setUser(currentUser);

      if (!currentUser) {
        setAccessGateMessage('');
        setAccessPollingState(false);
        applyAccessResult({ state: 'signed_out', message: '' });
        setCheckingAccess(false);
        return;
      }

      applyAccessResult({ state: 'checking', message: '' });
      setCheckingAccess(true);
      void loadAccessModule()
        .then(({ resolveAccessState }) => resolveAccessState(currentUser))
        .then((accessResult) => {
          if (allowlistCheckTokenRef.current !== checkToken) {
            return;
          }
          applyAccessResult(accessResult);
        })
        .catch((nextError) => {
          if (allowlistCheckTokenRef.current !== checkToken) {
            return;
          }
          applyAccessResult({
            state: 'denied',
            message: 'Falha ao validar acesso. Tenta novamente.'
          });
          setError(nextError.message);
        })
        .finally(() => {
          if (allowlistCheckTokenRef.current === checkToken) {
            setCheckingAccess(false);
          }
        });
    };

    const initializeAuthSubscription = async () => {
      try {
        await configureAuthPersistence();
      } catch {
        // Keep auth flow moving even if persistence setup fails.
      }

      try {
        await waitForAuthStateReady();
      } catch {
        // Fallback to subscription callback if auth-ready promise fails.
      }

      if (!isMounted) {
        return;
      }

      unsubscribe = subscribeToAuthChanges(handleCurrentUser);
    };

    void initializeAuthSubscription();

    return () => {
      isMounted = false;
      allowlistCheckTokenRef.current += 1;
      unsubscribe();
    };
  }, [applyAccessResult, setAccessPollingState]);

  const retryAccessCheck = useCallback(async () => {
    if (!user?.uid || accessState === 'signed_out' || accessState === 'firebase_missing') {
      return;
    }

    setError('');
    setAccessPollingState(true);

    try {
      const { resolveAccessState, pollApprovalState } = await loadAccessModule();
      const result =
        accessState === 'pending'
          ? await pollApprovalState(user)
          : await resolveAccessState(user);
      applyAccessResult(result);
    } catch (nextError) {
      applyAccessResult({
        state: accessState === 'pending' ? 'pending' : 'denied',
        message: 'Falha ao verificar acesso. Tenta novamente.'
      });
      setError(nextError.message);
    } finally {
      setAccessPollingState(false);
    }
  }, [accessState, applyAccessResult, setAccessPollingState, user]);

  useEffect(() => {
    if (accessState !== 'pending' || !user?.uid) {
      return () => {};
    }

    let isActive = true;

    const poll = async () => {
      if (!isActive) {
        return;
      }

      if (accessPollInFlightRef.current) {
        return;
      }

      setAccessPollingState(true);
      try {
        const { pollApprovalState } = await loadAccessModule();
        const result = await pollApprovalState(user);
        if (!isActive) {
          return;
        }
        applyAccessResult(result);
      } catch (nextError) {
        if (!isActive) {
          return;
        }
        setError(nextError.message);
      } finally {
        if (isActive) {
          setAccessPollingState(false);
        }
      }
    };

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, ACCESS_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [accessState, applyAccessResult, setAccessPollingState, user]);

  return {
    user,
    accessState,
    checkingAccess,
    accessGateMessage,
    accessPollInFlight,
    error,
    retryAccessCheck
  };
}
