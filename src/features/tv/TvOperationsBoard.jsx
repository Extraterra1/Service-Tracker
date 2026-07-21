import { getDeliveryDisplayTime, getReservationTime, selectNextUnfinished } from './tvBoard'

const STATUS_LABELS = {
  arrived: 'Aterrou',
  estimated: 'Estimado',
  delayed: 'Atrasado',
  departed: 'Em voo',
  scheduled: 'Programado',
}

function MetaItem({ label, children }) {
  if (!String(children ?? '').trim()) return null
  return <span className="tv-board-meta-item"><small>{label}</small><strong>{children}</strong></span>
}

function EmptyService({ type }) {
  return <p className="tv-board-empty">Sem {type === 'delivery' ? 'entregas' : 'recolhas'} pendentes</p>
}

function ServiceDetails({ item, flight }) {
  const clientName = String(item.name || 'Cliente sem nome').toLocaleUpperCase('pt-PT')

  return (
    <div className="tv-board-details">
      <h2>{clientName}</h2>
      <p className="tv-board-location">{item.location || 'Local por confirmar'}</p>
      <div className="tv-board-meta">
        <MetaItem label="Viatura">{item.car}</MetaItem>
        <MetaItem label="Matrícula">{item.plate}</MetaItem>
        <MetaItem label="Reserva">{item.id ? `#${item.id}` : ''}</MetaItem>
        {item.flightNumber ? <MetaItem label="Voo">{item.flightNumber}</MetaItem> : null}
        {flight?.status ? <MetaItem label="Estado">{STATUS_LABELS[String(flight.status).toLowerCase()] ?? flight.status}</MetaItem> : null}
      </div>
    </div>
  )
}

export default function TvOperationsBoard({ serviceData = { pickups: [], returns: [] }, statusMap = {}, flightResults = [], loading = false }) {
  const delivery = selectNextUnfinished(serviceData.pickups, statusMap)
  const recolha = selectNextUnfinished(serviceData.returns, statusMap)
  const deliveryTime = getDeliveryDisplayTime(delivery, flightResults)
  const deliveryFlight = delivery?.flightNumber
    ? flightResults.find((result) => String(result?.flightNumber ?? '').replace(/\s/g, '').toUpperCase() === String(delivery.flightNumber).replace(/\s/g, '').toUpperCase())
    : null

  if (loading) {
    return <main className="tv-board tv-board-loading" aria-busy="true"><p>A preparar o próximo serviço</p></main>
  }

  return (
    <main className="tv-board" aria-label="Próximos serviços">
      <section className="tv-board-section tv-board-delivery" role="region" aria-label="Próxima entrega">
        <div className="tv-board-heading"><p>Próxima entrega</p></div>
        {delivery ? (
          <div className="tv-board-service">
            <div className="tv-board-time-wrap">
              <time className="tv-board-time" dateTime={deliveryTime.time}>{deliveryTime.time}</time>
              <span className={`tv-board-time-source${deliveryTime.source === 'flight' ? ' is-flight' : ''}`}>{deliveryTime.source === 'flight' ? 'Hora do voo' : 'Hora da reserva'}</span>
            </div>
            <ServiceDetails item={delivery} flight={deliveryFlight} />
          </div>
        ) : <EmptyService type="delivery" />}
      </section>

      <section className="tv-board-section tv-board-return" role="region" aria-label="Próxima recolha">
        <div className="tv-board-heading"><p>Próxima recolha</p></div>
        {recolha ? (
          <div className="tv-board-service">
            <div className="tv-board-time-wrap">
              <time className="tv-board-time" dateTime={getReservationTime(recolha)}>{getReservationTime(recolha)}</time>
              <span className="tv-board-time-source">Hora da reserva</span>
            </div>
            <ServiceDetails item={recolha} />
          </div>
        ) : <EmptyService type="return" />}
      </section>
    </main>
  )
}
