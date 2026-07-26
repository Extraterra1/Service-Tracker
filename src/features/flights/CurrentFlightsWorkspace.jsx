import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, PlaneLanding, RefreshCw } from 'lucide-react'

import { FlightResult } from './FlightsWorkspace'
import { normalizeFlightNumber } from './flightNumbers'
import { sortFlightsByArrivalTime } from './flightSorting'
import FlightsWorkspaceSkeleton from './FlightsWorkspaceSkeleton'
import { useCurrentFlightData } from './useCurrentFlightData'

const CLOCK_TICK_MS = 60_000
const PREVIOUS_AFTER_MS = 60 * 60 * 1000

function isPreviousArrival(result, nowMs) {
  if (String(result?.status ?? '').toLowerCase() !== 'arrived') return false
  const arrivalMs = Date.parse(String(result?.arrivalTimestampUtc ?? ''))
  return Number.isFinite(arrivalMs) && nowMs - arrivalMs > PREVIOUS_AFTER_MS
}

export default function CurrentFlightsWorkspace({
  selectedDate,
  allServiceItems = [],
  serviceDataLoading = false,
  serviceDataReady = true,
  onRetryServiceData,
  onOpenReservation,
  userUid = '',
}) {
  const {
    flightNumbers,
    flightListKey,
    results: visibleResults,
    refreshing,
    error,
    cacheReady,
    refreshFlights,
  } = useCurrentFlightData({
    selectedDate,
    serviceItems: allServiceItems,
    serviceDataReady,
    userUid,
  })
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
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS)
    return () => window.clearInterval(clockTimer)
  }, [])

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
  const isInitialLoading = Boolean(flightListKey) && (!cacheReady || (visibleResults.length === 0 && refreshing))

  const renderFlight = (result, index) => (
    <FlightResult
      key={`${result.flightNumber}-${index}`}
      result={result}
      index={index}
      clients={clientsByFlight.get(normalizeFlightNumber(result?.flightNumber)) ?? []}
      onOpenReservation={onOpenReservation}
      singleTime
      prominentStatus
    />
  )

  return (
    <main className="flights-workspace flights-workspace--current" aria-busy={isInitialLoading || refreshing || isPreparingDay}>
      <header className="flights-board-header">
        <div><span className="flights-kicker">Voos · FNC · Hoje</span><h1>Chegadas</h1></div>
        <div className="flights-header-controls">
          <span className="flights-total">{serviceDataReady ? `${flightNumbers.length} ${flightNumbers.length === 1 ? 'voo' : 'voos'}` : '— voos'}</span>
          <time dateTime={selectedDate}>{selectedDate}</time>
          <button
            type="button"
            className={`ghost-btn compact-btn flights-refresh-btn ${refreshing ? 'is-refreshing' : ''}`}
            onClick={() => void refreshFlights({ force: true })}
            onPointerUp={(event) => {
              if (event.pointerType === 'touch' || event.pointerType === 'pen') event.currentTarget.blur()
            }}
            disabled={refreshing || isInitialLoading || !flightListKey}
            aria-busy={refreshing}
            aria-label={refreshing ? 'A atualizar todos os voos' : 'Atualizar todos os voos'}
          >
            <RefreshCw aria-hidden="true" /><span>{refreshing ? 'A atualizar' : 'Atualizar'}</span>
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
              {error ? <p className="flights-inline-refresh-error" role="alert">{error}</p> : null}
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
