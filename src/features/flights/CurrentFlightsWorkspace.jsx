import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, PlaneLanding, RefreshCw } from 'lucide-react'

import {
  getFlightStatusMemoryCache,
  isFlightStatusCacheFresh,
  saveFlightStatusCache,
  subscribeToFlightStatusDay,
  tryAcquireFlightStatusRefreshLease,
} from '../../lib/flightStatusStore'
import { toTimestampMs } from '../../lib/timestamp'
import { fetchCurrentFlights } from './currentFlightsApi'
import { FlightResult } from './FlightsWorkspace'
import { getPickupFlightNumbers, normalizeFlightNumber } from './flightNumbers'
import { sortFlightsByArrivalTime } from './flightSorting'
import FlightsWorkspaceSkeleton from './FlightsWorkspaceSkeleton'

const CACHE_CHECK_MS = 120_000
const CLOCK_TICK_MS = 60_000
const PREVIOUS_AFTER_MS = 60 * 60 * 1000

function isPreviousArrival(result, nowMs) {
  if (String(result?.status ?? '').toLowerCase() !== 'arrived') return false
  const arrivalMs = Date.parse(String(result?.arrivalTimestampUtc ?? ''))
  return Number.isFinite(arrivalMs) && nowMs - arrivalMs > PREVIOUS_AFTER_MS
}

function getSafeRefreshError(error) {
  if (error?.code === 'missing_api_key') return 'A chave da API FR24 não está configurada.'
  if (error?.code === 'unauthorized') return 'A autenticação da API FR24 falhou.'
  if (error?.code === 'rate_limited') return 'O limite de pedidos da API FR24 foi atingido. Tenta novamente dentro de instantes.'
  return 'Não foi possível atualizar os voos. Verifica a ligação e tenta novamente.'
}

export default function CurrentFlightsWorkspace({
  selectedDate,
  allServiceItems = [],
  serviceDataLoading = false,
  serviceDataReady = true,
  onRetryServiceData,
  userUid = '',
}) {
  const flightNumbers = useMemo(() => getPickupFlightNumbers(allServiceItems), [allServiceItems])
  const clientsByFlight = useMemo(() => {
    const clients = new Map()
    allServiceItems.forEach((item) => {
      if (item?.serviceType !== 'pickup') return
      const flightNumber = normalizeFlightNumber(item?.flightNumber)
      if (!flightNumber) return
      clients.set(flightNumber, [...(clients.get(flightNumber) ?? []), item])
    })
    return clients
  }, [allServiceItems])
  const flightListKey = flightNumbers.join('|')
  const initialCache = getFlightStatusMemoryCache(selectedDate)
  const initialCacheScope = initialCache ? `${selectedDate}:${flightListKey}` : ''
  const cacheRef = useRef(initialCache)
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(false)
  const abortRef = useRef(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
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
      if (!lease.acquired) return false
    }

    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    abortRef.current = controller
    inFlightRef.current = true
    setState((current) => ({ ...current, flightListKey, refreshing: true, error: '' }))
    try {
      const results = await fetchCurrentFlights({ date: selectedDate, flightNumbers, signal: controller.signal })
      if (requestId !== requestIdRef.current) return false
      const localCache = { date: selectedDate, flightNumbers, results, cachedAt: new Date() }
      cacheRef.current = localCache
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

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS)
    return () => window.clearInterval(clockTimer)
  }, [])

  useEffect(() => () => {
    requestIdRef.current += 1
    inFlightRef.current = false
    abortRef.current?.abort()
  }, [])

  const visibleResults = useMemo(() => {
    if (state.flightListKey !== flightListKey) return []
    const requested = new Set(flightNumbers)
    return state.results.filter((result) => requested.has(normalizeFlightNumber(result?.flightNumber)))
  }, [flightListKey, flightNumbers, state.flightListKey, state.results])
  const { currentResults, previousResults } = useMemo(() => {
    const current = []
    const previous = []
    visibleResults.forEach((result) => (isPreviousArrival(result, nowMs) ? previous : current).push(result))
    return {
      currentResults: sortFlightsByArrivalTime(current),
      previousResults: sortFlightsByArrivalTime(previous),
    }
  }, [nowMs, visibleResults])
  const isPreparingDay = serviceDataLoading && !serviceDataReady
  const isServiceDataUnavailable = !serviceDataLoading && !serviceDataReady
  const isInitialLoading = Boolean(flightListKey) && (!cacheReady || (visibleResults.length === 0 && state.refreshing))

  const renderFlight = (result, index) => (
    <FlightResult
      key={`${result.flightNumber}-${index}`}
      result={result}
      index={index}
      clients={clientsByFlight.get(normalizeFlightNumber(result?.flightNumber)) ?? []}
      singleTime
      prominentStatus
    />
  )

  return (
    <main className="flights-workspace flights-workspace--current" aria-busy={isInitialLoading || state.refreshing || isPreparingDay}>
      <header className="flights-board-header">
        <div><span className="flights-kicker">Voos · FNC · Hoje</span><h1>Chegadas</h1></div>
        <div className="flights-header-controls">
          <span className="flights-total">{serviceDataReady ? `${flightNumbers.length} ${flightNumbers.length === 1 ? 'voo' : 'voos'}` : '— voos'}</span>
          <time dateTime={selectedDate}>{selectedDate}</time>
          <button
            type="button"
            className={`ghost-btn compact-btn flights-refresh-btn ${state.refreshing ? 'is-refreshing' : ''}`}
            onClick={() => void refreshFlights({ force: true })}
            onPointerUp={(event) => {
              if (event.pointerType === 'touch' || event.pointerType === 'pen') event.currentTarget.blur()
            }}
            disabled={state.refreshing || isInitialLoading || !flightListKey}
            aria-busy={state.refreshing}
            aria-label={state.refreshing ? 'A atualizar todos os voos' : 'Atualizar todos os voos'}
          >
            <RefreshCw aria-hidden="true" /><span>{state.refreshing ? 'A atualizar' : 'Atualizar'}</span>
          </button>
        </div>
      </header>

      {isPreparingDay ? <FlightsWorkspaceSkeleton label="A preparar voos" />
        : isServiceDataUnavailable ? (
          <div className="flights-request-error" role="alert"><CircleAlert aria-hidden="true" /><p>Não foi possível obter os serviços de hoje.</p><button type="button" className="primary-btn compact-btn" onClick={() => void onRetryServiceData?.()}>Tentar novamente</button></div>
        ) : !flightListKey ? (
          <div className="flights-empty"><PlaneLanding aria-hidden="true" /><p>Não há voos de recolha para hoje.</p></div>
        ) : isInitialLoading ? <FlightsWorkspaceSkeleton label="A carregar voos" />
          : (
            <section className="flights-board" aria-label="Voos de hoje">
              <div className="flights-board-rule" aria-hidden="true"><span>ARR</span><span>FNC</span></div>
              {state.error ? <p className="flights-inline-refresh-error" role="alert">{state.error}</p> : null}
              <div className="flights-list">{currentResults.map(renderFlight)}</div>
              {previousResults.length ? (
                <details className="flights-previous">
                  <summary><span>Anteriores</span><strong>{previousResults.length}</strong></summary>
                  <div className="flights-list">{previousResults.map((result, index) => renderFlight(result, currentResults.length + index))}</div>
                </details>
              ) : null}
            </section>
          )}
    </main>
  )
}
