import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getFlightStatusMemoryCache,
  isFlightStatusCacheFresh,
  saveFlightStatusCache,
  subscribeToFlightStatusDay,
  tryAcquireFlightStatusRefreshLease,
} from '../../lib/flightStatusStore'
import { toTimestampMs } from '../../lib/timestamp'
import { fetchCurrentFlights } from '../flights/currentFlightsApi'
import { getPickupFlightNumbers } from '../flights/flightNumbers'

const REFRESH_CHECK_MS = 120_000

export function useTvFlightData({ selectedDate, deliveries = [], serviceDataReady = false, userUid = '' }) {
  const flightNumbers = useMemo(() => getPickupFlightNumbers(deliveries), [deliveries])
  const flightKey = flightNumbers.join('|')
  const initialCache = getFlightStatusMemoryCache(selectedDate)
  const cacheRef = useRef(initialCache)
  const inFlightRef = useRef(false)
  const abortRef = useRef(null)
  const [results, setResults] = useState(initialCache?.results ?? [])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!serviceDataReady || !selectedDate) return undefined
    const memoryCache = getFlightStatusMemoryCache(selectedDate)
    cacheRef.current = memoryCache
    if (memoryCache) setResults(memoryCache.results ?? [])
    return subscribeToFlightStatusDay(
      selectedDate,
      (cache) => {
        cacheRef.current = cache
        setResults(cache?.results ?? [])
      },
      () => { cacheRef.current = null },
      (error) => console.warn('TV flight cache could not be read. Continuing with local data.', error),
    )
  }, [flightKey, selectedDate, serviceDataReady])

  const refresh = useCallback(async () => {
    if (!serviceDataReady || !selectedDate || flightNumbers.length === 0 || inFlightRef.current) return false
    if (isFlightStatusCacheFresh(cacheRef.current, flightNumbers, new Date())) return false
    const cacheVersion = String(toTimestampMs(cacheRef.current?.cachedAt, 0) || 'missing')
    const lease = await tryAcquireFlightStatusRefreshLease({ date: selectedDate, userUid, cacheVersion })
    if (!lease.acquired || inFlightRef.current) return false

    const controller = new AbortController()
    abortRef.current = controller
    inFlightRef.current = true
    setRefreshing(true)
    try {
      const nextResults = await fetchCurrentFlights({ date: selectedDate, flightNumbers, signal: controller.signal })
      const cache = { date: selectedDate, flightNumbers, results: nextResults, cachedAt: new Date() }
      cacheRef.current = cache
      setResults(nextResults)
      try {
        await saveFlightStatusCache({ date: selectedDate, flightNumbers, results: nextResults, userUid })
      } catch (error) {
        console.warn('TV flight times updated, but shared cache could not be saved.', error)
      }
      return true
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('TV flight times could not be refreshed.', error)
      return false
    } finally {
      inFlightRef.current = false
      abortRef.current = null
      setRefreshing(false)
    }
  }, [flightNumbers, selectedDate, serviceDataReady, userUid])

  useEffect(() => {
    if (!serviceDataReady || !flightKey) return undefined
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_CHECK_MS)
    return () => window.clearInterval(timer)
  }, [flightKey, refresh, serviceDataReady])

  useEffect(() => () => {
    inFlightRef.current = false
    abortRef.current?.abort()
  }, [])

  return { results, refreshing, refresh }
}
