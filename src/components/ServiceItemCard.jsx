import { formatAuditTimestamp } from '../lib/date';
import { Plane } from 'lucide-react';

function ServiceItemCard({ item, status, onToggleDone, disabled }) {
  const done = status?.done === true;
  const updatedAt = formatAuditTimestamp(status?.updatedAt);
  const updatedBy = status?.updatedByName || status?.updatedByEmail || '';
  const serviceLabel = item.serviceType === 'return' ? 'RECOLHA' : 'ENTREGA';
  return (
    <article className={`service-item ${done ? 'is-done' : ''}`}>
      <div className="item-head">
        <div className="item-head-main">
          <span className="item-time">{item.time || '--:--'}</span>
          <span className="item-service-type">{serviceLabel}</span>
        </div>

        <label className="item-check" aria-label={`Marcar ${item.name || item.id || item.itemId} como concluído`}>
          <input type="checkbox" checked={done} disabled={disabled} onChange={(event) => onToggleDone(item, event.target.checked)} />
          <span>Feito</span>
        </label>
      </div>

      <p className="item-name">{item.name || 'Sem nome'}</p>
      <p className="item-subline">
        <span>#{item.id || 'n/a'}</span>
        <span>{item.phone || 'Sem telefone'}</span>
        {item.flightNumber ? (
          <span className="item-flight-tag">
            <Plane className="item-flight-icon" aria-hidden="true" />
            <span>{item.flightNumber}</span>
          </span>
        ) : null}
      </p>

      <p className="item-carline">
        {item.car || 'Sem viatura'} {item.plate ? `- ${item.plate}` : ''}
      </p>
      <p className="item-location">{item.location || 'Localização não indicada'}</p>

      {Array.isArray(item.extras) && item.extras.length > 0 ? <p className="item-note item-note-extra">Extras: {item.extras.join(', ')}</p> : null}

      {item.notes ? <p className="item-note item-note-highlight">Notas: {item.notes}</p> : null}

      <footer className="item-footer">{updatedBy && updatedAt ? `Atualizado por ${updatedBy} às ${updatedAt}` : 'Sem atualização de equipa'}</footer>
    </article>
  );
}

export default ServiceItemCard;
