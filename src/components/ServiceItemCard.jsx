import { formatAuditTimestamp } from '../lib/date'

function ServiceItemCard({ item, status, onToggleDone, disabled }) {
  const done = status?.done === true
  const updatedAt = formatAuditTimestamp(status?.updatedAt)
  const updatedBy = status?.updatedByName || status?.updatedByEmail || ''
  const serviceLabel = item.serviceType === 'return' ? 'RECOLHA' : 'ENTREGA'

  return (
    <article className={`service-item ${done ? 'is-done' : ''}`}>
      <div className="item-top-row">
        <div className="item-main-meta">
          <span className="item-burst" aria-hidden="true">
            ✹
          </span>
          <span className="item-service-type">{serviceLabel}</span>
        </div>

        <label className="item-check" aria-label={`Marcar ${item.name || item.id || item.itemId} como concluído`}>
          <input
            type="checkbox"
            checked={done}
            disabled={disabled}
            onChange={(event) => onToggleDone(item, event.target.checked)}
          />
          <span>Feito</span>
        </label>
      </div>

      <div className="item-main-text">
        <p className="item-name">
          <span className="item-time">{item.time || '--:--'}</span> {item.name || 'Sem nome'}
        </p>
        <p className="item-id">#{item.id || 'n/a'}</p>
      </div>

      <div className="item-grid">
        <p>{item.phone || 'Sem telefone'}</p>
        <p>{item.car || 'Sem viatura'}</p>
        <p>{item.plate || 'Sem matrícula'}</p>
        <p>{item.flightNumber ? `VOO ${item.flightNumber}` : 'Sem voo'}</p>
      </div>

      {item.location ? <p className="item-location">{item.location}</p> : null}

      {Array.isArray(item.extras) && item.extras.length > 0 ? (
        <p className="item-note">Extras: {item.extras.join(', ')}</p>
      ) : null}

      {item.notes ? <p className="item-note">Notas: {item.notes}</p> : null}

      <footer className="item-footer">
        {updatedBy && updatedAt ? `Atualizado por ${updatedBy} às ${updatedAt}` : 'Sem atualização de equipa'}
      </footer>
    </article>
  )
}

export default ServiceItemCard
