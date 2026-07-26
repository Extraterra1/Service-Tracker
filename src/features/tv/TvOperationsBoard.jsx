import { getDeliveryDisplayTime, getReservationTime, selectNextUnfinishedItems } from './tvBoard'
import justDriveLogo from '../../assets/Logo Base.svg'

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

function BrandLogo() {
  return <img className="tv-board-brand" src={justDriveLogo} alt="JustDrive Madeira Rent-A-Car" />
}

function ServiceDetails({ item, flight, hideFlightStatus = false }) {
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
        {flight?.status && !hideFlightStatus ? <MetaItem label="Estado">{STATUS_LABELS[String(flight.status).toLowerCase()] ?? flight.status}</MetaItem> : null}
      </div>
    </div>
  )
}

function NextRecolha({ item }) {
  const clientName = String(item.name || 'Cliente sem nome').toLocaleUpperCase('pt-PT')

  return (
    <aside className="tv-board-next-return" aria-label="Recolha a seguir">
      <span className="tv-board-next-return-label">A seguir</span>
      <time dateTime={getReservationTime(item)}>{getReservationTime(item)}</time>
      <h3>{clientName}</h3>
      <p>{item.location || 'Local por confirmar'}</p>
      <strong>{item.plate || 'Matrícula por confirmar'}</strong>
    </aside>
  )
}

function NextDelivery({ item, flightResults }) {
  const clientName = String(item.name || 'Cliente sem nome').toLocaleUpperCase('pt-PT')
  const displayTime = getDeliveryDisplayTime(item, flightResults)

  return (
    <aside className="tv-board-next-delivery" aria-label="Entrega a seguir">
      <span className="tv-board-next-delivery-label">A seguir</span>
      <time dateTime={displayTime.time}>{displayTime.time}</time>
      <h3>{clientName}</h3>
      <p>{item.location || 'Local por confirmar'}</p>
      <strong>{item.plate || 'Matrícula por confirmar'}</strong>
    </aside>
  )
}

export default function TvOperationsBoard({ serviceData = { pickups: [], returns: [] }, statusMap = {}, flightResults = [], loading = false }) {
  const [delivery, nextDelivery] = selectNextUnfinishedItems(serviceData.pickups, statusMap, 2)
  const [recolha, nextRecolha] = selectNextUnfinishedItems(serviceData.returns, statusMap, 2)
  const deliveryTime = getDeliveryDisplayTime(delivery, flightResults)
  const deliveryFlight = delivery?.flightNumber
    ? flightResults.find((result) => String(result?.flightNumber ?? '').replace(/\s/g, '').toUpperCase() === String(delivery.flightNumber).replace(/\s/g, '').toUpperCase())
    : null
  const deliveryHasLanded = String(deliveryFlight?.status ?? '').toLowerCase() === 'arrived'

  if (loading) {
    return <main className="tv-board tv-board-loading" aria-busy="true"><BrandLogo /><p>A preparar o próximo serviço</p></main>
  }

  return (
    <main className="tv-board" aria-label="Próximos serviços">
      <BrandLogo />
      <section className={`tv-board-section tv-board-delivery${deliveryHasLanded ? ' is-landed' : ''}`} role="region" aria-label="Próxima entrega">
        <div className="tv-board-heading"><p>Próxima entrega</p></div>
        {delivery ? (
          <div className={`tv-board-service${nextDelivery ? ' has-secondary' : ''}`}>
            <div className="tv-board-time-wrap">
              <time className="tv-board-time" dateTime={deliveryTime.time}>{deliveryTime.time}</time>
              {deliveryHasLanded ? <strong className="tv-board-landed-status" role="status">✓ ATERROU</strong> : null}
              <span className={`tv-board-time-source${deliveryTime.source === 'flight' ? ' is-flight' : ''}`}>{deliveryTime.source === 'flight' ? 'Hora do voo' : 'Hora da reserva'}</span>
            </div>
            <ServiceDetails item={delivery} flight={deliveryFlight} hideFlightStatus={deliveryHasLanded} />
            {nextDelivery ? <NextDelivery item={nextDelivery} flightResults={flightResults} /> : null}
          </div>
        ) : <EmptyService type="delivery" />}
      </section>

      <section className="tv-board-section tv-board-return" role="region" aria-label="Próxima recolha">
        <div className="tv-board-heading"><p>Próxima recolha</p></div>
        {recolha ? (
          <div className={`tv-board-service${nextRecolha ? ' has-secondary' : ''}`}>
            <div className="tv-board-time-wrap">
              <time className="tv-board-time" dateTime={getReservationTime(recolha)}>{getReservationTime(recolha)}</time>
              <span className="tv-board-time-source">Hora da reserva</span>
            </div>
            <ServiceDetails item={recolha} />
            {nextRecolha ? <NextRecolha item={nextRecolha} /> : null}
          </div>
        ) : <EmptyService type="return" />}
      </section>
    </main>
  )
}
