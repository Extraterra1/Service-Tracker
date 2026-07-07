import { CalendarDays, ChevronLeft, ChevronRight, RotateCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { fetchReservations } from '../../lib/reservationsApi'
import ReservationDetailsPopup from './ReservationDetailsPopup'
import { formatReservationField, getReservationCountryCode, RESERVATION_STATUS_LABELS } from './reservationDisplay'

const STATUS_OPTIONS = ['confirmed', 'pending', 'collected', 'completed', 'cancelled']
const countryNames = new Intl.DisplayNames(['pt-PT'], { type: 'region' })

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  return debounced
}

function displayValue(value) {
  const text = String(value ?? '').trim()
  return text || '-'
}

function displayVehicle(reservation) {
  const vehicle = [reservation.carMake, reservation.carModel]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
  const plate = displayValue(reservation.licensePlate)
  return vehicle ? `${vehicle} - ${plate}` : plate
}

export default function ReservationsWorkspace() {
  const [query, setQuery] = useState('')
  const [pickupFrom, setPickupFrom] = useState('')
  const [pickupTo, setPickupTo] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [requestVersion, setRequestVersion] = useState(0)
  const [requestState, setRequestState] = useState({ key: '', payload: null, error: '' })
  const [selectedReservation, setSelectedReservation] = useState(null)
  const openerRef = useRef(null)
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const requestKey = JSON.stringify([page, pageSize, debouncedQuery, pickupFrom, pickupTo, selectedStatuses, requestVersion])

  useEffect(() => {
    let active = true

    fetchReservations({ page, pageSize, pickupFrom, pickupTo, q: debouncedQuery, status: selectedStatuses })
      .then((data) => {
        if (active) setRequestState({ key: requestKey, payload: data, error: '' })
      })
      .catch(() => {
        if (active) setRequestState({ key: requestKey, payload: null, error: 'Não foi possível carregar as reservas.' })
      })

    return () => {
      active = false
    }
  }, [debouncedQuery, page, pageSize, pickupFrom, pickupTo, requestKey, selectedStatuses])

  const loading = requestState.key !== requestKey
  const payload = loading ? null : requestState.payload
  const error = loading ? '' : requestState.error
  const reservations = payload?.reservations ?? []
  const totalRows = Number(payload?.totalRows ?? 0)
  const totalPages = Math.max(Number(payload?.totalPages ?? 1), 1)
  const startRow = totalRows ? (page - 1) * pageSize + 1 : 0
  const endRow = totalRows ? Math.min(page * pageSize, totalRows) : 0
  const statusEntries = useMemo(
    () => Object.entries(payload?.statusCounts ?? {}).sort(([left], [right]) => left.localeCompare(right)),
    [payload],
  )

  const closeDetails = useCallback(() => {
    setSelectedReservation(null)
    openerRef.current?.focus()
  }, [])

  return (
    <main className="reservations-workspace">
      <section className="reservations-summary" aria-label="Resumo das reservas">
        <div className="reservations-total">
          <span>{debouncedQuery || pickupFrom || pickupTo ? 'Resultados' : 'Reservas'}</span>
          <strong>{loading && !payload ? '...' : totalRows.toLocaleString('pt-PT')}</strong>
        </div>
        <div className="reservations-status-summary" aria-label="Contagens por estado">
          {statusEntries.map(([status, count]) => (
            <span key={status} className={`reservation-status is-${status}`}>
              {RESERVATION_STATUS_LABELS[status] ?? formatReservationField('status', status)}: {Number(count).toLocaleString('pt-PT')}
            </span>
          ))}
        </div>
      </section>

      <section className="reservations-toolbar" aria-label="Pesquisa e paginação de reservas">
        <div className="reservations-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Referência, cliente, matrícula, contacto, local ou origem"
            aria-label="Pesquisar reservas"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpar pesquisa">
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="reservations-filter-row">
          <label className="reservations-status-filter" htmlFor="reservations-status">
            <span>Estado</span>
            <select
              id="reservations-status"
              className="reservations-status-select"
              value={selectedStatuses[0] ?? ''}
              onChange={(event) => {
                setSelectedStatuses(event.target.value ? [event.target.value] : [])
                setPage(1)
              }}
            >
              <option value="">Todas</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{RESERVATION_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </label>

          <div className="reservations-date-filter">
            <CalendarDays size={17} aria-hidden="true" />
            <label htmlFor="reservations-pickup-from">Entrega de</label>
            <input
              id="reservations-pickup-from"
              type="date"
              value={pickupFrom}
              onChange={(event) => {
                setPickupFrom(event.target.value)
                setPage(1)
              }}
            />
            <label htmlFor="reservations-pickup-to">Até</label>
            <input
              id="reservations-pickup-to"
              type="date"
              value={pickupTo}
              onChange={(event) => {
                setPickupTo(event.target.value)
                setPage(1)
              }}
              aria-label="Entrega até"
            />
            {pickupFrom || pickupTo ? (
              <button
                type="button"
                onClick={() => {
                  setPickupFrom('')
                  setPickupTo('')
                  setPage(1)
                }}
                aria-label="Limpar intervalo de entrega"
              >
                <X size={15} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="reservations-pager">
          <span>{startRow.toLocaleString('pt-PT')}–{endRow.toLocaleString('pt-PT')} de {totalRows.toLocaleString('pt-PT')}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
            aria-label="Reservas por página"
          >
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button type="button" onClick={() => setPage((value) => Math.max(value - 1, 1))} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <strong>{page} / {totalPages}</strong>
          <button type="button" onClick={() => setPage((value) => Math.min(value + 1, totalPages))} disabled={page >= totalPages} aria-label="Página seguinte">
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      {error ? (
        <section className="reservations-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>
            <RotateCw size={16} aria-hidden="true" />
            Tentar novamente
          </button>
        </section>
      ) : null}

      <section className={`reservations-table-wrap ${loading ? 'is-loading' : ''}`} aria-label="Reservas" aria-busy={loading}>
        <ul className="reservations-list">
          {loading ? Array.from({ length: 10 }, (_, index) => (
            <li key={`skeleton-${index}`} className="reservation-item-skeleton" data-testid="reservation-skeleton" aria-hidden="true" />
          )) : null}
          {reservations.map((reservation) => {
            const countryCode = getReservationCountryCode(reservation)
            const countryName = countryCode ? countryNames.of(countryCode) : ''
            return (
              <li key={`${reservation.reference}-${reservation.id}`}>
                <button
                  className="reservation-item"
                  type="button"
                  aria-label={`Abrir reserva de ${displayValue(reservation.customer)}`}
                  onClick={(event) => {
                    openerRef.current = event.currentTarget
                    setSelectedReservation(reservation)
                  }}
                >
                <span className="reservation-item-client">
                  {countryCode ? <ReactCountryFlag countryCode={countryCode} svg title={countryName} /> : null}
                  <strong>{displayValue(reservation.customer)}</strong>
                </span>
                <span className={`reservation-status is-${reservation.status}`}>{formatReservationField('status', reservation.status) || '-'}</span>
                <span className="reservation-item-datetime"><small>Entrega</small>{formatReservationField('pickupAt', reservation.pickupAt) || '-'}</span>
                <span className="reservation-item-datetime"><small>Recolha</small>{formatReservationField('returnAt', reservation.returnAt) || '-'}</span>
                <span className="reservation-item-vehicle"><small>Grupo</small>{formatReservationField('vehicleGroup', reservation.vehicleGroup) || '-'}</span>
                <span className="reservation-plate"><small>Viatura</small>{displayVehicle(reservation)}</span>
                <ChevronRight className="reservation-item-chevron" size={17} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
        {!loading && !error && reservations.length === 0 ? <p className="reservations-empty">Sem reservas correspondentes.</p> : null}
      </section>
      {selectedReservation ? <ReservationDetailsPopup reservation={selectedReservation} onClose={closeDetails} /> : null}
    </main>
  )
}
