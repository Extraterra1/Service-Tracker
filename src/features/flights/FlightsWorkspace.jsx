import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CircleAlert, ExternalLink, PlaneLanding } from 'lucide-react'
import ReactCountryFlag from 'react-country-flag'
import { FaWhatsapp } from 'react-icons/fa'

import { detectPhoneCountryCode, getWhatsAppHref } from '../../lib/phone'
import { fetchFlightArrivals } from './flightsApi'
import { getPickupFlightNumbers, normalizeFlightNumber } from './flightNumbers'
import FlightsWorkspaceSkeleton from './FlightsWorkspaceSkeleton'

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

function getSafeReservationUrl(value) {
  try {
    const url = new URL(String(value ?? ''))
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
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

function FlightClient({ client }) {
  const name = String(client?.name ?? '').trim() || '—'
  const car = String(client?.car ?? '').trim() || '—'
  const plate = String(client?.plate ?? '').trim().toUpperCase() || '—'
  const phone = String(client?.phone ?? '').trim()
  const countryCode = detectPhoneCountryCode(phone)
  const whatsappUrl = getWhatsAppHref(phone)
  const reservationId = String(client?.id ?? '').trim()
  const reservationUrl = getSafeReservationUrl(client?.reservationUrl)

  return (
    <div className="flight-client" data-testid="flight-client">
      <span className="flight-client-flag">
        {countryCode ? (
          <ReactCountryFlag countryCode={countryCode} svg title={countryCode} />
        ) : '—'}
      </span>
      <strong className="flight-client-name">{name}</strong>
      <span className="flight-client-detail"><small>Carro</small>{car}</span>
      <span className="flight-client-detail flight-client-plate"><small>Matrícula</small>{plate}</span>
      {whatsappUrl ? (
        <a className="flight-client-phone" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${phone}`}>
          <FaWhatsapp aria-hidden="true" />
          <span>{phone}</span>
        </a>
      ) : (
        <span className="flight-client-phone flight-client-phone--disabled">{phone || '—'}</span>
      )}
      {reservationUrl ? (
        <a
          className="flight-client-reservation"
          href={reservationUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={reservationId ? `Reservations ${reservationId}` : 'Reservations'}
        >
          Reservations
          <ExternalLink aria-hidden="true" />
        </a>
      ) : (
        <span className="flight-client-reservation flight-client-reservation--disabled">—</span>
      )}
    </div>
  )
}

function FlightResult({ result, index, clients = [] }) {
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

      {clients.length > 0 ? (
        <div className="flight-clients" aria-label={`Clientes do voo ${flightNumber}`}>
          <span className="flight-clients-label">Clients</span>
          {clients.map((client, clientIndex) => (
            <FlightClient client={client} key={client?.itemId ?? client?.id ?? clientIndex} />
          ))}
        </div>
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
  const clientsByFlight = useMemo(() => {
    const groupedClients = new Map()

    allServiceItems.forEach((item) => {
      if (item?.serviceType !== 'pickup') return
      const flightNumber = normalizeFlightNumber(item?.flightNumber)
      if (!flightNumber) return
      groupedClients.set(flightNumber, [...(groupedClients.get(flightNumber) ?? []), item])
    })

    return groupedClients
  }, [allServiceItems])
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
        <FlightsWorkspaceSkeleton label="A preparar voos" />
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
        <FlightsWorkspaceSkeleton label="A carregar voos" />
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
            {state.results.map((result, index) => {
              const clients = clientsByFlight.get(normalizeFlightNumber(result?.flightNumber)) ?? []
              return <FlightResult key={`${result.flightNumber}-${index}`} result={result} index={index} clients={clients} />
            })}
          </div>
        </section>
      )}
    </main>
  )
}

export default FlightsWorkspace
