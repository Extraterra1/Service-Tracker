import { memo } from 'react';
import { formatAuditTimestamp } from '../lib/date';
import { Plane, Repeat2 } from 'lucide-react';

function normalizePlate(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function toTimestampMs(timestampLike) {
  if (!timestampLike) {
    return 0;
  }

  if (typeof timestampLike.toDate === 'function') {
    return timestampLike.toDate().getTime();
  }

  if (typeof timestampLike.seconds === 'number') {
    return timestampLike.seconds * 1000;
  }

  const parsed = new Date(timestampLike);
  const value = parsed.getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getSharedMarkerColor(markers, plateValue) {
  const plateKey = normalizePlate(plateValue);
  return plateKey ? markers?.[plateKey]?.color ?? '' : '';
}

function getDisplayTime(item) {
  return String(item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim() || '--:--';
}

function ServiceItemCard({ item, status, sharedPlateMarkers = {}, onSharedPlateTap, onToggleDone, disabled }) {
  const done = status?.done === true;
  const updatedAt = formatAuditTimestamp(status?.updatedAt);
  const updatedBy = status?.updatedByName || status?.updatedByEmail || '';
  const serviceLabel = item.serviceType === 'return' ? 'RECOLHA' : 'ENTREGA';
  const originalTime = String(item.time ?? '').trim() || '--:--';
  const displayTime = getDisplayTime(item);
  const hasManualOverride = Boolean(item.overrideTime) && item.overrideTime !== item.time;
  const plateKey = normalizePlate(item.plate);
  const sharedPlateMarker = plateKey ? sharedPlateMarkers[plateKey] : null;

  return (
    <article className={`service-item ${done ? 'is-done' : ''}`}>
      <div className="item-head">
        <div className="item-head-main">
          <span className="item-time">{displayTime}</span>
          {hasManualOverride ? <span className="item-time-original">{originalTime}</span> : null}
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
                <button
                  type="button"
                  className="item-shared-plate-tag item-shared-plate-button"
                  style={{ '--shared-plate-color': sharedPlateMarker.color }}
                  title="Viatura com entrega e recolha nesta data"
                  aria-label="Viatura com entrega e recolha nesta data"
                  onClick={() => onSharedPlateTap?.(sharedPlateMarker)}
                >
                  <Repeat2 className="item-shared-plate-icon" aria-hidden="true" />
                </button>
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

function areSameItemProps(prevProps, nextProps) {
  const prevItem = prevProps.item;
  const nextItem = nextProps.item;
  const prevStatus = prevProps.status;
  const nextStatus = nextProps.status;

  if (prevProps.disabled !== nextProps.disabled) {
    return false;
  }

  if (prevProps.onToggleDone !== nextProps.onToggleDone || prevProps.onSharedPlateTap !== nextProps.onSharedPlateTap) {
    return false;
  }

  if (
    prevItem.itemId !== nextItem.itemId ||
    prevItem.time !== nextItem.time ||
    prevItem.overrideTime !== nextItem.overrideTime ||
    prevItem.displayTime !== nextItem.displayTime ||
    prevItem.serviceType !== nextItem.serviceType ||
    prevItem.name !== nextItem.name ||
    prevItem.id !== nextItem.id ||
    prevItem.phone !== nextItem.phone ||
    prevItem.flightNumber !== nextItem.flightNumber ||
    prevItem.car !== nextItem.car ||
    prevItem.plate !== nextItem.plate ||
    prevItem.location !== nextItem.location ||
    prevItem.notes !== nextItem.notes
  ) {
    return false;
  }

  const prevExtras = Array.isArray(prevItem.extras) ? prevItem.extras.join('|') : '';
  const nextExtras = Array.isArray(nextItem.extras) ? nextItem.extras.join('|') : '';
  if (prevExtras !== nextExtras) {
    return false;
  }

  if (
    (prevStatus?.done ?? false) !== (nextStatus?.done ?? false) ||
    (prevStatus?.updatedByName ?? '') !== (nextStatus?.updatedByName ?? '') ||
    (prevStatus?.updatedByEmail ?? '') !== (nextStatus?.updatedByEmail ?? '') ||
    toTimestampMs(prevStatus?.updatedAt) !== toTimestampMs(nextStatus?.updatedAt)
  ) {
    return false;
  }

  return (
    getSharedMarkerColor(prevProps.sharedPlateMarkers, prevItem.plate) ===
    getSharedMarkerColor(nextProps.sharedPlateMarkers, nextItem.plate)
  );
}

export default memo(ServiceItemCard, areSameItemProps);
