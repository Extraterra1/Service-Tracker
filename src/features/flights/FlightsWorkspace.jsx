import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CircleAlert, ExternalLink, LoaderCircle, PlaneLanding } from 'lucide-react'

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

function getSafeSourceUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' && url.hostname === 'www.flightview.com' ? url.href : ''
  } catch {
    return ''
  }
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
  const sourceUrl = getSafeSourceUrl(result?.sourceUrl)

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

      {!hasError && sourceUrl ? (
        <a className="flight-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${flightNumber} no FlightView`}>
          <ExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </article>
  )
}

function FlightsWorkspace({
  selectedDate,
  allServiceItems = [],
  serviceDataLoading = false,
  serviceDataReady = true,
  onRetryServiceData,
  onWorkspaceChange,
}) {
  const flightNumbers = useMemo(() => getPickupFlightNumbers(allServiceItems), [allServiceItems])
  const flightListKey = flightNumbers.join('|')
  const requestIdRef = useRef(0)
  const [retryVersion, setRetryVersion] = useState(0)
  const [state, setState] = useState({ requestToken: null, status: 'idle', results: [], error: '' })
  const currentRequestKey = `${selectedDate}:${flightListKey}:${retryVersion}:${serviceDataReady ? 'ready' : 'waiting'}`
  const requestToken = useMemo(() => ({ key: currentRequestKey }), [currentRequestKey])

  useEffect(() => {
    const requestId = ++requestIdRef.current

    if (!serviceDataReady || !flightListKey) {
      return () => {
        requestIdRef.current += 1
      }
    }

    const currentFlights = flightListKey.split('|')

    fetchFlightArrivals({ arrivalDate: selectedDate, flightNumbers: currentFlights })
      .then((payload) => {
        if (requestId !== requestIdRef.current) return
        setState({ requestToken, status: 'success', results: payload?.results ?? [], error: '' })
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        setState({ requestToken, status: 'error', results: [], error: 'Não foi possível carregar as chegadas. Verifica a ligação e tenta novamente.' })
      })

    return () => {
      requestIdRef.current += 1
    }
  }, [selectedDate, flightListKey, requestToken, serviceDataReady])

  const isLoading = serviceDataReady && Boolean(flightListKey) && state.requestToken !== requestToken
  const isPreparingDay = serviceDataLoading && !serviceDataReady
  const isServiceDataUnavailable = !serviceDataLoading && !serviceDataReady

  const retryServiceData = () => {
    Promise.resolve(onRetryServiceData?.()).catch(() => {})
  }

  return (
    <main className="flights-workspace" aria-busy={isLoading || isPreparingDay}>
      <header className="flights-board-header">
        <div>
          <span className="flights-kicker">Voos · FNC</span>
          <h1>Chegadas ao Funchal</h1>
        </div>
        <div className="flights-header-controls">
          <span className="flights-total">
            {serviceDataReady ? `${flightNumbers.length} ${flightNumbers.length === 1 ? 'voo' : 'voos'}` : '— voos'}
          </span>
          <time dateTime={selectedDate}>{selectedDate}</time>
          <button type="button" className="ghost-btn compact-btn flights-back-btn" onClick={() => onWorkspaceChange?.('services')} aria-label="Voltar à lista de serviços">
            <ArrowLeft aria-hidden="true" />
            <span>Lista</span>
          </button>
        </div>
      </header>

      {isPreparingDay ? (
        <div className="flights-loading" role="status">
          <LoaderCircle aria-hidden="true" />
          <span>A preparar dados do dia…</span>
        </div>
      ) : isServiceDataUnavailable ? (
        <div className="flights-request-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>Não foi possível obter os serviços deste dia.</p>
          <button type="button" className="primary-btn compact-btn" onClick={retryServiceData}>Tentar novamente</button>
        </div>
      ) : !flightListKey ? (
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
