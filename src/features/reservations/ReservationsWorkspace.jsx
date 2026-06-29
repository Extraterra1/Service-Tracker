import { ChevronLeft, ChevronRight, RotateCw, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchReservations } from '../../lib/reservationsApi'

const STATUS_OPTIONS = ['confirmed', 'pending', 'collected', 'completed', 'cancelled']
const STATUS_LABELS = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  collected: 'Recolhida',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}
const currency = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

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

export default function ReservationsWorkspace() {
  const [query, setQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [requestVersion, setRequestVersion] = useState(0)
  const [requestState, setRequestState] = useState({ key: '', payload: null, error: '' })
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
            {[25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}
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
        <table className="reservations-table">
          <thead>
            <tr>
              <th>Referência</th><th>Cliente</th><th>Telefone</th><th>Email</th><th>Estado</th><th>Grupo</th><th>Matrícula</th>
              <th>Entrega</th><th>Recolha</th><th>Origem</th><th>Valor manual</th><th>Comentários entrega</th>
              <th>Comentários recolha</th><th>Voo chegada</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={`${reservation.reference}-${reservation.id}`}>
                <td className="reservation-reference">{displayValue(reservation.reference)}</td>
                <td>{displayValue(reservation.customer)}</td>
                <td>{displayValue(reservation.clientPhone)}</td>
                <td>{displayValue(reservation.clientEmail)}</td>
                <td><span className={`reservation-status is-${reservation.status}`}>{STATUS_LABELS[reservation.status] ?? displayValue(reservation.status)}</span></td>
                <td>{displayValue(reservation.vehicleGroup)}</td>
                <td className="reservation-plate">{displayValue(reservation.licensePlate)}</td>
                <td><span>{displayValue(reservation.pickupAt)}</span><small>{displayValue(reservation.pickupStation)}</small></td>
                <td><span>{displayValue(reservation.returnAt)}</span><small>{displayValue(reservation.returnStation)}</small></td>
                <td>{displayValue(reservation.origin)}</td>
                <td className="reservation-money">{currency.format(Number(reservation.manualValue || 0))}</td>
                <td className="reservation-comments">{displayValue(reservation.deliveryComments)}</td>
                <td className="reservation-comments">{displayValue(reservation.returnComments)}</td>
                <td>{displayValue(reservation.arrivalFlight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !error && reservations.length === 0 ? <p className="reservations-empty">Sem reservas correspondentes.</p> : null}
      </section>
    </main>
  )
}
