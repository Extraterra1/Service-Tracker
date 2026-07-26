import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getFlightStatusMemoryCache,
  isFlightStatusCacheFresh,
  saveFlightStatusCache,
  subscribeToFlightStatusDay,
  tryAcquireFlightStatusRefreshLease,
} from '../../lib/flightStatusStore'
import { toTimestampMs } from '../../lib/timestamp'
import { fetchCurrentFlights } from './currentFlightsApi'
import { getPickupFlightNumbers, normalizeFlightNumber } from './flightNumbers'

const CACHE_CHECK_MS = 120_000

function getSafeRefreshError(error) {
  if (error?.code === 'missing_api_key') return 'A chave da API FR24 não está configurada.'
  if (error?.code === 'unauthorized') return 'A autenticação da API FR24 falhou.'
  if (error?.code === 'rate_limited') return 'O limite de pedidos da API FR24 foi atingido. Tenta novamente dentro de instantes.'
  return 'Não foi possível atualizar os voos. Verifica a ligação e tenta novamente.'
}

export function useCurrentFlightData({ selectedDate, serviceItems = [], serviceDataReady = false, userUid = '' }) {
  const flightNumbers = useMemo(() => getPickupFlightNumbers(serviceItems), [serviceItems])
  const flightListKey = flightNumbers.join('|')
  const initialCache = getFlightStatusMemoryCache(selectedDate)
  const initialCacheScope = initialCache ? `${selectedDate}:${flightListKey}` : ''
  const cacheRef = useRef(initialCache)
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(false)
  const abortRef = useRef(null)
  const [cacheScope, setCacheScope] = useState(initialCacheScope)
  const [state, setState] = useState(() => ({
    flightListKey: initialCache ? flightListKey : '',
    results: initialCache?.results ?? [],
    refreshing: false,
    error: '',
  }))

  useEffect(() => {
    if (!serviceDataReady || !selectedDate) return undefined
    const scope = `${selectedDate}:${flightListKey}`
    const memoryCache = getFlightStatusMemoryCache(selectedDate)
    cacheRef.current = memoryCache
    if (memoryCache) {
      setState((current) => ({ ...current, flightListKey, results: memoryCache.results, error: '' }))
      setCacheScope(scope)
    }
    return subscribeToFlightStatusDay(
      selectedDate,
      (cache) => {
        cacheRef.current = cache
        setState((current) => ({ ...current, flightListKey, results: cache.results, error: '' }))
        setCacheScope(scope)
      },
      () => {
        cacheRef.current = null
        setCacheScope(scope)
      },
      (error) => {
        console.warn('Shared flight cache could not be read. Continuing with local data.', error)
        setCacheScope(scope)
      },
    )
  }, [flightListKey, selectedDate, serviceDataReady])

  const cacheReady = cacheScope === `${selectedDate}:${flightListKey}`

  const refreshFlights = useCallback(async ({ force = false } = {}) => {
    if (!serviceDataReady || !flightListKey || inFlightRef.current) return false
    if (!force) {
      if (isFlightStatusCacheFresh(cacheRef.current, flightNumbers, new Date())) return false
      const cacheVersion = String(toTimestampMs(cacheRef.current?.cachedAt, 0) || 'missing')
      const lease = await tryAcquireFlightStatusRefreshLease({ date: selectedDate, userUid, cacheVersion })
      if (!lease.acquired || inFlightRef.current) return false
    }

    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    abortRef.current = controller
    inFlightRef.current = true
    setState((current) => ({ ...current, flightListKey, refreshing: true, error: '' }))
    try {
      const results = await fetchCurrentFlights({ date: selectedDate, flightNumbers, signal: controller.signal })
      if (requestId !== requestIdRef.current) return false
      cacheRef.current = { date: selectedDate, flightNumbers, results, cachedAt: new Date() }
      setState({ flightListKey, results, refreshing: false, error: '' })
      try {
        await saveFlightStatusCache({ date: selectedDate, flightNumbers, results, userUid })
      } catch (error) {
        console.warn('Flight times updated, but the shared cache could not be saved.', error)
      }
      return true
    } catch (error) {
      if (error?.name === 'AbortError' || requestId !== requestIdRef.current) return false
      setState((current) => ({ ...current, refreshing: false, error: getSafeRefreshError(error) }))
      return false
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false
        abortRef.current = null
      }
    }
  }, [flightListKey, flightNumbers, selectedDate, serviceDataReady, userUid])

  useEffect(() => {
    if (!cacheReady || !serviceDataReady || !flightListKey) return undefined
    void refreshFlights()
    const refreshTimer = window.setInterval(() => void refreshFlights(), CACHE_CHECK_MS)
    return () => window.clearInterval(refreshTimer)
  }, [cacheReady, flightListKey, refreshFlights, serviceDataReady])

  useEffect(() => () => {
    requestIdRef.current += 1
    inFlightRef.current = false
    abortRef.current?.abort()
  }, [])

  const results = useMemo(() => {
    if (state.flightListKey !== flightListKey) return []
    const requested = new Set(flightNumbers)
    return state.results.filter((result) => requested.has(normalizeFlightNumber(result?.flightNumber)))
  }, [flightListKey, flightNumbers, state.flightListKey, state.results])

  return {
    flightNumbers,
    flightListKey,
    results,
    refreshing: state.refreshing,
    error: state.error,
    cacheReady,
    refreshFlights,
  }
}
