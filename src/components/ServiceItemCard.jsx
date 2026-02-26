import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { formatAuditTimestamp } from '../lib/date';
import { Clock3, Plane, Repeat2 } from 'lucide-react';

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

function isValidTimeInput(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value ?? '').trim());
}

function ServiceItemCard({
  item,
  status,
  readyState,
  sharedPlateMarkers = {},
  onSharedPlateTap,
  onToggleDone,
  onToggleReady,
  onSaveTimeOverride,
  disabled,
}) {
  const done = status?.done === true;
  const updatedAt = formatAuditTimestamp(status?.updatedAt);
  const updatedBy = status?.updatedByName || status?.updatedByEmail || '';
  const serviceLabel = item.serviceType === 'return' ? 'RECOLHA' : 'ENTREGA';
  const originalTime = String(item.time ?? '').trim() || '--:--';
  const displayTime = getDisplayTime(item);
  const hasManualOverride = Boolean(item.overrideTime) && item.overrideTime !== item.time;
  const plateKey = normalizePlate(item.plate);
  const sharedPlateMarker = plateKey ? sharedPlateMarkers[plateKey] : null;
  const isDelivery = item.serviceType === 'pickup';
  const isReady = readyState?.ready === true;
  const canToggleReady = isDelivery && Boolean(String(item.plate ?? '').trim()) && typeof onToggleReady === 'function';
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const timeMenuWrapRef = useRef(null);
  const initialEditorTime = useMemo(() => (String(item.overrideTime ?? item.time ?? '').trim() || '').slice(0, 5), [item.overrideTime, item.time]);
  const originalEditorTime = useMemo(() => (String(item.time ?? '').trim() || '').slice(0, 5), [item.time]);
  const [editTimeValue, setEditTimeValue] = useState(initialEditorTime);
  const canResetTime = hasManualOverride && isValidTimeInput(originalEditorTime);

  useEffect(() => {
    if (!timeMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!timeMenuWrapRef.current?.contains(event.target)) {
        setTimeMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setTimeMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [timeMenuOpen]);

  const handleSaveTime = async () => {
    if (!onSaveTimeOverride || !editTimeValue) {
      return;
    }

    const success = await onSaveTimeOverride(item, editTimeValue);
    if (success) {
      setTimeMenuOpen(false);
    }
  };

  const handleResetTime = async () => {
    if (!onSaveTimeOverride || !canResetTime) {
      return;
    }

    const success = await onSaveTimeOverride(item, originalEditorTime);
    if (success) {
      setEditTimeValue(originalEditorTime);
      setTimeMenuOpen(false);
    }
  };

  return (
    <article className={`service-item ${done ? 'is-done' : ''} ${timeMenuOpen ? 'has-time-menu' : ''}`}>
      <div className="item-head">
        <div className="item-head-main">
          <span className="item-time">{displayTime}</span>
          {hasManualOverride ? <span className="item-time-original">{originalTime}</span> : null}
          <span className="item-service-type">{serviceLabel}</span>
        </div>

        <div className="item-actions">
          <div
            ref={timeMenuWrapRef}
            className="item-time-menu-wrap"
            onClick={(event) => {
              if (disabled || timeMenuOpen) {
                return;
              }

              if (event.target.closest('.item-time-menu')) {
                return;
              }

              setEditTimeValue(initialEditorTime);
              setTimeMenuOpen(true);
            }}
          >
            <button
              type="button"
              className="item-time-menu-trigger"
              onClick={() => {
                if (timeMenuOpen) {
                  setTimeMenuOpen(false);
                  return;
                }
                setEditTimeValue(initialEditorTime);
                setTimeMenuOpen(true);
              }}
              disabled={disabled}
              aria-label="Editar hora"
              aria-expanded={timeMenuOpen ? 'true' : 'false'}
              title="Editar hora"
            >
              <Clock3 className="item-time-menu-icon" aria-hidden="true" />
            </button>

            {timeMenuOpen ? (
              <div className="item-time-menu">
                <input type="time" value={editTimeValue} onChange={(event) => setEditTimeValue(event.target.value)} disabled={disabled} />
                <button type="button" className="item-time-menu-save" onClick={handleSaveTime} disabled={disabled || !editTimeValue}>
                  Guardar
                </button>
                <button type="button" className="item-time-menu-reset" onClick={handleResetTime} disabled={disabled || !canResetTime}>
                  Reset
                </button>
                <button
                  type="button"
                  className="item-time-menu-cancel"
                  onClick={() => {
                    setEditTimeValue(initialEditorTime);
                    setTimeMenuOpen(false);
                  }}
                  disabled={disabled}
                >
                  Fechar
                </button>
              </div>
            ) : null}
          </div>

          <label className="item-check" aria-label={`Marcar ${item.name || item.id || item.itemId} como concluído`}>
            <input type="checkbox" checked={done} disabled={disabled} onChange={(event) => onToggleDone(item, event.target.checked)} />
            <span>Feito</span>
          </label>
        </div>
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
              {canToggleReady ? (
                <button
                  type="button"
                  className={`item-plate-button ${isReady ? 'is-ready' : ''}`}
                  onClick={() => onToggleReady(item)}
                  disabled={disabled}
                  aria-pressed={isReady ? 'true' : 'false'}
                  aria-label={isReady ? `Remover viatura ${item.plate} de pronta` : `Marcar viatura ${item.plate} como pronta`}
                  title={isReady ? 'Pronta - toque para remover' : 'Toque para marcar pronta'}
                >
                  <span>- {item.plate}</span>
                  {isReady ? <span className="item-ready-dot" aria-hidden="true" /> : null}
                </button>
              ) : (
                <span>- {item.plate}</span>
              )}
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

  if (
    prevProps.onToggleDone !== nextProps.onToggleDone ||
    prevProps.onSharedPlateTap !== nextProps.onSharedPlateTap ||
    prevProps.onToggleReady !== nextProps.onToggleReady ||
    prevProps.onSaveTimeOverride !== nextProps.onSaveTimeOverride
  ) {
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

  if (
    (prevProps.readyState?.ready ?? false) !== (nextProps.readyState?.ready ?? false) ||
    (prevProps.readyState?.plate ?? '') !== (nextProps.readyState?.plate ?? '') ||
    toTimestampMs(prevProps.readyState?.updatedAt) !== toTimestampMs(nextProps.readyState?.updatedAt)
  ) {
    return false;
  }

  return (
    getSharedMarkerColor(prevProps.sharedPlateMarkers, prevItem.plate) ===
    getSharedMarkerColor(nextProps.sharedPlateMarkers, nextItem.plate)
  );
}

export default memo(ServiceItemCard, areSameItemProps);
