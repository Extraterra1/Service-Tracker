import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, ExternalLink, LoaderCircle, PlaneLanding } from 'lucide-react'

import { fetchFlightArrivals } from './flightsApi'
import { getPickupFlightNumbers } from './flightNumbers'

const STATUS_LABELS = {
  planned: 'Planeado',
  scheduled: 'Programado',
  arrived: 'Chegou',
  delayed: 'Atrasado',
  estimated: 'Estimado',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  unknown: 'Desconhecido',
}

const ERROR_LABELS = {
  not_found: 'Voo não encontrado',
  ambiguous_match: 'Foram encontrados vários voos possíveis',
  flightview_unavailable: 'FlightView temporariamente indisponível',
  parse_failed: 'Não foi possível interpretar os dados do voo',
}

function formatTime(value) {
  const match = String(value ?? '').match(/(?:T|\s|^)([01]\d|2[0-3]):([0-5]\d)/)
  return match ? `${match[1]}:${match[2]}` : '--:--'
}

function localizeStatus(status) {
  const normalized = String(status ?? '').trim()
  if (!normalized) return STATUS_LABELS.unknown
  return STATUS_LABELS[normalized.toLowerCase()] ?? normalized
}

function FlightTime({ label, value }) {
  return (
    <div className="flight-time">
      <dt>{label}</dt>
      <dd>{formatTime(value)}</dd>
    </div>
  )
}

function FlightResult({ result, index }) {
  const flightNumber = String(result?.flightNumber ?? '').trim() || '—'
  const hasError = Boolean(result?.error)
  const status = hasError
    ? (ERROR_LABELS[result.error.code] ?? 'Não foi possível consultar este voo')
    : localizeStatus(result?.status)

  return (
    <article
      className={`flight-row ${hasError ? 'flight-row--error' : ''}`}
      style={{ '--flight-index': index }}
      aria-label={`Voo ${flightNumber}`}
    >
      <div className="flight-identity">
        <span className="flight-route-mark" aria-hidden="true"><PlaneLanding /></span>
        <strong>{flightNumber}</strong>
        <span>FNC</span>
      </div>

      {hasError ? (
        <p className="flight-inline-error"><CircleAlert aria-hidden="true" />{status}</p>
      ) : (
        <dl className="flight-times">
          <FlightTime label="Programado" value={result.scheduledArrivalLocal} />
          <FlightTime label="Estimado" value={result.estimatedArrivalLocal} />
          <FlightTime label="Real" value={result.actualArrivalLocal} />
        </dl>
      )}

      <div className={`flight-status flight-status--${String(result?.status ?? 'unknown').toLowerCase()}`}>
        <span>Estado</span>
        <strong>{status}</strong>
      </div>

      {!hasError && result.sourceUrl ? (
        <a className="flight-source-link" href={result.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${flightNumber} no FlightView`}>
          <ExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </article>
  )
}

function FlightsWorkspace({ selectedDate, allServiceItems = [] }) {
  const flightNumbers = useMemo(() => getPickupFlightNumbers(allServiceItems), [allServiceItems])
  const flightListKey = flightNumbers.join('|')
  const requestIdRef = useRef(0)
  const [retryVersion, setRetryVersion] = useState(0)
  const [state, setState] = useState({ requestKey: '', status: 'idle', results: [], error: '' })
  const currentRequestKey = `${selectedDate}:${flightListKey}:${retryVersion}`

  useEffect(() => {
    const requestId = ++requestIdRef.current

    if (!flightListKey) {
      return () => {
        requestIdRef.current += 1
      }
    }

    const currentFlights = flightListKey.split('|')

    fetchFlightArrivals({ arrivalDate: selectedDate, flightNumbers: currentFlights })
      .then((payload) => {
        if (requestId !== requestIdRef.current) return
        setState({ requestKey: currentRequestKey, status: 'success', results: payload?.results ?? [], error: '' })
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        setState({ requestKey: currentRequestKey, status: 'error', results: [], error: 'Não foi possível carregar as chegadas. Verifica a ligação e tenta novamente.' })
      })

    return () => {
      requestIdRef.current += 1
    }
  }, [selectedDate, flightListKey, currentRequestKey])

  const isLoading = Boolean(flightListKey) && state.requestKey !== currentRequestKey

  return (
    <main className="flights-workspace" aria-busy={isLoading}>
      <header className="flights-board-header">
        <div>
          <span className="flights-kicker">Voos · FNC</span>
          <h1>Chegadas ao Funchal</h1>
        </div>
        <time dateTime={selectedDate}>{selectedDate}</time>
      </header>

      {!flightListKey ? (
        <div className="flights-empty">
          <PlaneLanding aria-hidden="true" />
          <p>Não há voos de recolha para este dia.</p>
        </div>
      ) : isLoading ? (
        <div className="flights-loading" role="status">
          <LoaderCircle aria-hidden="true" />
          <span>A carregar voos…</span>
        </div>
      ) : state.status === 'error' ? (
        <div className="flights-request-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>{state.error}</p>
          <button type="button" className="primary-btn compact-btn" onClick={() => setRetryVersion((version) => version + 1)}>Tentar novamente</button>
        </div>
      ) : (
        <section className="flights-board" aria-label="Lista de chegadas">
          <div className="flights-board-rule" aria-hidden="true"><span>ARR</span><span>RWY 05</span></div>
          <div className="flights-list">
            {state.results.map((result, index) => <FlightResult key={`${result.flightNumber}-${index}`} result={result} index={index} />)}
          </div>
        </section>
      )}
    </main>
  )
}

export default FlightsWorkspace
