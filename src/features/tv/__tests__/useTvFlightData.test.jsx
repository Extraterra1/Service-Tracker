import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTvFlightData } from '../useTvFlightData'

const storeMocks = vi.hoisted(() => ({
  getFlightStatusMemoryCache: vi.fn(() => null),
  isFlightStatusCacheFresh: vi.fn(() => true),
  saveFlightStatusCache: vi.fn(() => Promise.resolve(true)),
  subscribeToFlightStatusDay: vi.fn(() => () => {}),
  tryAcquireFlightStatusRefreshLease: vi.fn(() => Promise.resolve({ acquired: true })),
}))
const fetchCurrentFlights = vi.hoisted(() => vi.fn())

vi.mock('../../../lib/flightStatusStore', () => storeMocks)
vi.mock('../../flights/currentFlightsApi', () => ({ fetchCurrentFlights }))

const delivery = { itemId: 'delivery', serviceType: 'pickup', flightNumber: 'TP1685' }

describe('useTvFlightData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeMocks.getFlightStatusMemoryCache.mockReturnValue(null)
    storeMocks.isFlightStatusCacheFresh.mockReturnValue(true)
    storeMocks.subscribeToFlightStatusDay.mockImplementation(() => () => {})
  })

  it('publishes results from the shared day subscription', async () => {
    storeMocks.subscribeToFlightStatusDay.mockImplementation((_date, onData) => {
      onData({ results: [{ flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:42' }], cachedAt: new Date() })
      return () => {}
    })

    const { result } = renderHook(() => useTvFlightData({ selectedDate: '2026-07-21', deliveries: [delivery], serviceDataReady: true, userUid: 'u1' }))

    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(result.current.results[0].arrivalTimeLocal).toContain('10:42')
  })

  it('refreshes stale flight data and saves the shared result', async () => {
    storeMocks.isFlightStatusCacheFresh.mockReturnValue(false)
    fetchCurrentFlights.mockResolvedValue([{ flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:55' }])

    const { result } = renderHook(() => useTvFlightData({ selectedDate: '2026-07-21', deliveries: [delivery], serviceDataReady: true, userUid: 'u1' }))

    await act(async () => { await result.current.refresh() })
    expect(fetchCurrentFlights).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-07-21', flightNumbers: ['TP1685'] }))
    expect(storeMocks.saveFlightStatusCache).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-07-21', userUid: 'u1' }))
    expect(result.current.results[0].arrivalTimeLocal).toContain('10:55')
  })
})
