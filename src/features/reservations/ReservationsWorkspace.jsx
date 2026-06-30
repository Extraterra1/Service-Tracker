import { ChevronLeft, ChevronRight, RotateCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactCountryFlag from 'react-country-flag'
import { fetchReservations } from '../../lib/reservationsApi'
import ReservationDetailsPopup from './ReservationDetailsPopup'

const STATUS_OPTIONS = ['confirmed', 'pending', 'collected', 'completed', 'cancelled']
const STATUS_LABELS = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  collected: 'Recolhida',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}
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

function getCountryCode(reservation) {
  const value = String(reservation.countryCode ?? reservation.country ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(value) ? value : ''
}

export default function ReservationsWorkspace() {
  const [query, setQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [requestVersion, setRequestVersion] = useState(0)
  const [requestState, setRequestState] = useState({ key: '', payload: null, error: '' })
  const [selectedReservation, setSelectedReservation] = useState(null)
  const openerRef = useRef(null)
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const requestKey = JSON.stringify([page, pageSize, debouncedQuery, selectedStatuses, requestVersion])

  useEffect(() => {
    let active = true

    fetchReservations({ page, pageSize, q: debouncedQuery, status: selectedStatuses })
      .then((data) => {
        if (active) setRequestState({ key: requestKey, payload: data, error: '' })
      })
      .catch(() => {
        if (active) setRequestState({ key: requestKey, payload: null, error: 'Não foi possível carregar as reservas.' })
      })

    return () => {
      active = false
    }
  }, [debouncedQuery, page, pageSize, requestKey, selectedStatuses])

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

  function toggleStatus(status) {
    setPage(1)
    setSelectedStatuses((current) => (
      current.includes(status) ? current.filter((entry) => entry !== status) : [...current, status]
    ))
  }

  const closeDetails = useCallback(() => {
    setSelectedReservation(null)
    openerRef.current?.focus()
  }, [])

  return (
    <main className="reservations-workspace">
      <section className="reservations-summary" aria-label="Resumo das reservas">
        <div className="reservations-total">
          <span>{debouncedQuery ? 'Resultados' : 'Reservas'}</span>
          <strong>{loading && !payload ? '...' : totalRows.toLocaleString('pt-PT')}</strong>
        </div>
        <div className="reservations-status-summary" aria-label="Contagens por estado">
          {statusEntries.map(([status, count]) => (
            <span key={status} className={`reservation-status is-${status}`}>
              {STATUS_LABELS[status] ?? status}: {Number(count).toLocaleString('pt-PT')}
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

        <div className="reservations-status-filters" aria-label="Filtrar por estado">
          <button
            type="button"
            className={selectedStatuses.length === 0 ? 'is-active' : ''}
            aria-pressed={selectedStatuses.length === 0}
            onClick={() => {
              setSelectedStatuses([])
              setPage(1)
            }}
          >
            Todas
          </button>
          {STATUS_OPTIONS.map((status) => (
            <button
              type="button"
              key={status}
              className={selectedStatuses.includes(status) ? 'is-active' : ''}
              aria-pressed={selectedStatuses.includes(status)}
              onClick={() => toggleStatus(status)}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
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
            const countryCode = getCountryCode(reservation)
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
                <span className={`reservation-status is-${reservation.status}`}>{STATUS_LABELS[reservation.status] ?? displayValue(reservation.status)}</span>
                <span className="reservation-item-datetime"><small>Entrega</small>{displayValue(reservation.pickupAt)}</span>
                <span className="reservation-item-datetime"><small>Recolha</small>{displayValue(reservation.returnAt)}</span>
                <span className="reservation-item-vehicle"><small>Grupo</small>{displayValue(reservation.vehicleGroup)}</span>
                <span className="reservation-plate"><small>Matrícula</small>{displayValue(reservation.licensePlate)}</span>
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
