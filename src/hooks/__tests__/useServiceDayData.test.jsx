import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refreshServiceDayViaApiMock = vi.fn()
const isScrapedDocStaleMock = vi.fn()
const subscribeToScrapedDayMock = vi.fn()
const tryAcquireAutoRefreshLeaseMock = vi.fn()

vi.mock('../../lib/api', () => ({
  refreshServiceDayViaApi: (...args) => refreshServiceDayViaApiMock(...args),
}))

vi.mock('../../lib/scrapedDataStore', () => ({
  isScrapedDocStale: (...args) => isScrapedDocStaleMock(...args),
  subscribeToScrapedDay: (...args) => subscribeToScrapedDayMock(...args),
}))

vi.mock('../../lib/serviceRefreshLockStore', () => ({
  tryAcquireAutoRefreshLease: (...args) => tryAcquireAutoRefreshLeaseMock(...args),
}))

import { useServiceDayData } from '../useServiceDayData'

function mockExistingDaySnapshot(payload = {}) {
  subscribeToScrapedDayMock.mockImplementation((_date, onData) => {
    onData({
      date: '2026-03-05',
      cachedAt: '2026-03-05T10:00:00.000Z',
      pickups: [{ itemId: 'pickup-1', serviceType: 'pickup' }],
      returns: [],
      ...payload,
    })
    return () => {}
  })
}

describe('useServiceDayData', () => {
  beforeEach(() => {
    refreshServiceDayViaApiMock.mockReset()
    isScrapedDocStaleMock.mockReset()
    subscribeToScrapedDayMock.mockReset()
    tryAcquireAutoRefreshLeaseMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('auto-refreshes stale data only when lease lock is acquired', async () => {
    isScrapedDocStaleMock.mockReturnValue(true)
    mockExistingDaySnapshot()
    tryAcquireAutoRefreshLeaseMock.mockResolvedValue({ acquired: true, reason: 'lease_acquired' })
    refreshServiceDayViaApiMock.mockResolvedValue({ pickups: [], returns: [] })

    renderHook(() =>
      useServiceDayData({
        canReadServiceData: true,
        selectedDate: '2026-03-05',
        pin: '1234',
        userUid: 'uid-1',
      }),
    )

    await waitFor(() => {
      expect(tryAcquireAutoRefreshLeaseMock).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(refreshServiceDayViaApiMock).toHaveBeenCalledTimes(1)
      expect(refreshServiceDayViaApiMock).toHaveBeenCalledWith(
        expect.objectContaining({
          date: '2026-03-05',
          pin: '1234',
          forceRefresh: true,
        }),
      )
    })
  })

  it('skips auto-refresh API call when lease lock is held by another user', async () => {
    isScrapedDocStaleMock.mockReturnValue(true)
    mockExistingDaySnapshot()
    tryAcquireAutoRefreshLeaseMock.mockResolvedValue({ acquired: false, reason: 'locked' })

    renderHook(() =>
      useServiceDayData({
        canReadServiceData: true,
        selectedDate: '2026-03-05',
        pin: '1234',
        userUid: 'uid-2',
      }),
    )

    await waitFor(() => {
      expect(tryAcquireAutoRefreshLeaseMock).toHaveBeenCalledTimes(1)
    })

    expect(refreshServiceDayViaApiMock).not.toHaveBeenCalled()
  })

  it('manual refresh remains force-refresh and does not use shared lock', async () => {
    isScrapedDocStaleMock.mockReturnValue(false)
    mockExistingDaySnapshot()
    refreshServiceDayViaApiMock.mockResolvedValue({ pickups: [], returns: [] })

    const { result } = renderHook(() =>
      useServiceDayData({
        canReadServiceData: true,
        selectedDate: '2026-03-05',
        pin: '1234',
        userUid: 'uid-3',
      }),
    )

    await waitFor(() => {
      expect(result.current.loadingDateData).toBe(false)
    })

    await act(async () => {
      result.current.manualRefresh()
    })

    await waitFor(() => {
      expect(refreshServiceDayViaApiMock).toHaveBeenCalledTimes(1)
    })

    expect(refreshServiceDayViaApiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-03-05',
        pin: '1234',
        forceRefresh: true,
      }),
    )
    expect(tryAcquireAutoRefreshLeaseMock).not.toHaveBeenCalled()
  })

  it('shows 30-minute stale warning when auto-refresh cannot run without PIN', async () => {
    isScrapedDocStaleMock.mockReturnValue(true)
    mockExistingDaySnapshot()

    const { result } = renderHook(() =>
      useServiceDayData({
        canReadServiceData: true,
        selectedDate: '2026-03-05',
        pin: '',
        userUid: 'uid-4',
      }),
    )

    await waitFor(() => {
      expect(result.current.staleWarning).toContain('30 minutos')
    })

    expect(refreshServiceDayViaApiMock).not.toHaveBeenCalled()
    expect(tryAcquireAutoRefreshLeaseMock).not.toHaveBeenCalled()
  })
})
