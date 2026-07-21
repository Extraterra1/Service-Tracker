import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchReservationDetails } = vi.hoisted(() => ({ fetchReservationDetails: vi.fn() }))

vi.mock('../reservationsApi', () => ({ fetchReservationDetails }))

describe('reservationDetailsCache', () => {
  beforeEach(() => {
    const values = new Map()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => [...values.keys()][index] ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, String(value)),
        get length() { return values.size }
      }
    })
    vi.resetModules()
    vi.useRealTimers()
    fetchReservationDetails.mockReset()
    window.localStorage.clear()
  })

  it('persists successful reservation details across module reloads', async () => {
    const reservation = { reference: '00123', customer: 'Maria' }
    fetchReservationDetails.mockResolvedValue(reservation)
    const cache = await import('../reservationDetailsCache')

    await cache.fetchAndCacheReservation('00123')
    vi.resetModules()
    const reloadedCache = await import('../reservationDetailsCache')

    expect(reloadedCache.readCachedReservation('123')).toEqual(reservation)
    expect(fetchReservationDetails).toHaveBeenCalledTimes(1)
  })

  it('expires cached reservation details after 24 hours', async () => {
    const now = Date.parse('2026-07-21T10:00:00.000Z')
    vi.setSystemTime(now)
    fetchReservationDetails.mockResolvedValue({ reference: '00123', customer: 'Maria' })
    const cache = await import('../reservationDetailsCache')

    await cache.fetchAndCacheReservation('123')

    expect(cache.readCachedReservation('00123', now + cache.RESERVATION_CACHE_TTL_MS - 1)).not.toBeNull()
    expect(cache.readCachedReservation('00123', now + cache.RESERVATION_CACHE_TTL_MS)).toBeNull()
  })

  it('sweeps unrelated expired reservations from persisted storage', async () => {
    const now = Date.parse('2026-07-21T10:00:00.000Z')
    vi.setSystemTime(now)
    fetchReservationDetails.mockImplementation(async (reference) => ({ reference }))
    const cache = await import('../reservationDetailsCache')
    await cache.fetchAndCacheReservation('100')
    vi.setSystemTime(now + cache.RESERVATION_CACHE_TTL_MS - 1_000)
    await cache.fetchAndCacheReservation('200')

    cache.readCachedReservation('200', now + cache.RESERVATION_CACHE_TTL_MS)

    const persistedEntries = JSON.parse(window.localStorage.getItem(window.localStorage.key(0)))
    expect(persistedEntries).not.toHaveProperty('100')
    expect(persistedEntries).toHaveProperty('200')
  })

  it('ignores malformed persisted storage', async () => {
    const cache = await import('../reservationDetailsCache')
    fetchReservationDetails.mockResolvedValue({ reference: '123' })
    await cache.fetchAndCacheReservation('123')
    const storageKey = window.localStorage.key(0)

    vi.resetModules()
    window.localStorage.setItem(storageKey, '{broken')
    const reloadedCache = await import('../reservationDetailsCache')

    expect(reloadedCache.readCachedReservation('123')).toBeNull()
  })

  it('deduplicates in-flight requests for equivalent references', async () => {
    let resolveRequest
    fetchReservationDetails.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const cache = await import('../reservationDetailsCache')

    const firstRequest = cache.fetchAndCacheReservation('00123')
    const secondRequest = cache.fetchAndCacheReservation('123')

    expect(secondRequest).toBe(firstRequest)
    expect(fetchReservationDetails).toHaveBeenCalledTimes(1)
    resolveRequest({ reference: '00123' })
    await firstRequest
  })

  it('prefetches only uncached references with bounded concurrency', async () => {
    let activeRequests = 0
    let peakRequests = 0
    const resolvers = []
    fetchReservationDetails.mockImplementation((reference) => new Promise((resolve) => {
      activeRequests += 1
      peakRequests = Math.max(peakRequests, activeRequests)
      resolvers.push(() => {
        activeRequests -= 1
        resolve({ reference })
      })
    }))
    const cache = await import('../reservationDetailsCache')

    const prefetch = cache.prefetchReservationDetails(['001', '1', '2', '3'], { concurrency: 2 })
    await vi.waitFor(() => expect(fetchReservationDetails).toHaveBeenCalledTimes(2))
    resolvers.shift()()
    await vi.waitFor(() => expect(fetchReservationDetails).toHaveBeenCalledTimes(3))
    resolvers.splice(0).forEach((resolve) => resolve())
    await prefetch

    expect(peakRequests).toBe(2)
    expect(fetchReservationDetails.mock.calls.map(([reference]) => reference)).toEqual(['001', '2', '3'])
  })

  it('shares the concurrency bound across overlapping prefetch calls', async () => {
    let activeRequests = 0
    let peakRequests = 0
    const resolvers = []
    fetchReservationDetails.mockImplementation((reference) => new Promise((resolve) => {
      activeRequests += 1
      peakRequests = Math.max(peakRequests, activeRequests)
      resolvers.push(() => {
        activeRequests -= 1
        resolve({ reference })
      })
    }))
    const cache = await import('../reservationDetailsCache')

    const firstPrefetch = cache.prefetchReservationDetails(['10', '11'], { concurrency: 2 })
    const secondPrefetch = cache.prefetchReservationDetails(['20', '21'], { concurrency: 2 })
    await vi.waitFor(() => expect(fetchReservationDetails).toHaveBeenCalledTimes(2))
    expect(peakRequests).toBe(2)
    resolvers.splice(0).forEach((resolve) => resolve())
    await vi.waitFor(() => expect(fetchReservationDetails).toHaveBeenCalledTimes(4))
    resolvers.splice(0).forEach((resolve) => resolve())
    await Promise.all([firstPrefetch, secondPrefetch])

    expect(peakRequests).toBe(2)
  })
})
