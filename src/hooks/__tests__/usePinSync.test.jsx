import { useState } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const readUserPinMock = vi.fn();
const saveUserPinMock = vi.fn();

vi.mock('../../lib/pinStore', () => ({
  readUserPin: (...args) => readUserPinMock(...args),
  saveUserPin: (...args) => saveUserPinMock(...args)
}));

import { usePinSync } from '../usePinSync';

function usePinSyncHarness({ accessState = 'allowed', user = { uid: 'uid-1' }, initialPin = '' } = {}) {
  const [pin, setPin] = useState(initialPin);
  const pinSync = usePinSync({
    accessState,
    user,
    pin,
    setPin
  });

  return {
    pin,
    setPin,
    ...pinSync
  };
}

describe('usePinSync', () => {
  beforeEach(() => {
    readUserPinMock.mockReset();
    saveUserPinMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('loads the cloud pin on access and exposes resync for later refreshes', async () => {
    readUserPinMock.mockResolvedValueOnce('4321').mockResolvedValueOnce('8765');

    const { result } = renderHook(() => usePinSyncHarness());

    await waitFor(() => {
      expect(readUserPinMock).toHaveBeenCalledTimes(1);
      expect(result.current.pin).toBe('4321');
      expect(result.current.pinSyncState).toBe('synced');
    });

    await act(async () => {
      await result.current.resync();
    });

    await waitFor(() => {
      expect(readUserPinMock).toHaveBeenCalledTimes(2);
      expect(result.current.pin).toBe('8765');
      expect(result.current.pinSyncState).toBe('synced');
    });
  });

  it('seeds an empty cloud pin from the current local pin', async () => {
    readUserPinMock.mockResolvedValue('');
    saveUserPinMock.mockResolvedValue();

    const { result } = renderHook(() =>
      usePinSyncHarness({
        initialPin: '1234'
      })
    );

    await waitFor(() => {
      expect(saveUserPinMock).toHaveBeenCalledWith('uid-1', '1234');
      expect(result.current.pinSyncState).toBe('synced');
    });
  });

  it('debounces local pin saves and avoids redundant writes', async () => {
    readUserPinMock.mockResolvedValue('1111');
    saveUserPinMock.mockResolvedValue();

    const { result } = renderHook(() => usePinSyncHarness());

    await waitFor(() => {
      expect(result.current.pin).toBe('1111');
      expect(result.current.pinSyncState).toBe('synced');
    });

    vi.useFakeTimers();
    saveUserPinMock.mockClear();

    act(() => {
      result.current.setPin('2222');
    });

    act(() => {
      vi.advanceTimersByTime(399);
    });

    expect(saveUserPinMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveUserPinMock).toHaveBeenCalledTimes(1);
    expect(saveUserPinMock).toHaveBeenCalledWith('uid-1', '2222');
    expect(result.current.pinSyncState).toBe('synced');

    act(() => {
      result.current.setPin('2222');
      vi.advanceTimersByTime(400);
    });

    expect(saveUserPinMock).toHaveBeenCalledTimes(1);
  });
});
