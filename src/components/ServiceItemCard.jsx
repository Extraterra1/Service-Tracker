import { formatAuditTimestamp } from '../lib/date';
import { Plane, Repeat2 } from 'lucide-react';

function normalizePlate(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function ServiceItemCard({ item, status, sharedPlateMarkers = {}, onToggleDone, disabled }) {
  const done = status?.done === true;
  const updatedAt = formatAuditTimestamp(status?.updatedAt);
  const updatedBy = status?.updatedByName || status?.updatedByEmail || '';
  const serviceLabel = item.serviceType === 'return' ? 'RECOLHA' : 'ENTREGA';
  const plateKey = normalizePlate(item.plate);
  const sharedPlateMarker = plateKey ? sharedPlateMarkers[plateKey] : null;

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

      <div className="item-identity-row">
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
      </div>

      <div className="item-vehicle-row">
        <p className="item-carline">
          {item.car || 'Sem viatura'}
          {item.plate ? (
            <span className="item-plate-wrap">
              <span>- {item.plate}</span>
              {sharedPlateMarker ? (
                <span
                  className="item-shared-plate-tag"
                  style={{ '--shared-plate-color': sharedPlateMarker.color }}
                  title="Viatura com entrega e recolha nesta data"
                  aria-label="Viatura com entrega e recolha nesta data"
                >
                  <Repeat2 className="item-shared-plate-icon" aria-hidden="true" />
                </span>
              ) : null}
            </span>
          ) : null}
        </p>
        <p className="item-location">{item.location || 'Localização não indicada'}</p>
      </div>

      {Array.isArray(item.extras) && item.extras.length > 0 ? <p className="item-note item-note-extra">Extras: {item.extras.join(', ')}</p> : null}

      {item.notes ? <p className="item-note item-note-highlight">Notas: {item.notes}</p> : null}

      <footer className="item-footer">{updatedBy && updatedAt ? `Atualizado por ${updatedBy} às ${updatedAt}` : 'Sem atualização de equipa'}</footer>
    </article>
  );
}

export default ServiceItemCard;
