import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import ReactCountryFlag from 'react-country-flag';
import { formatAuditTimestamp } from '../lib/date';
import { detectPhoneCountryCode, getWhatsAppHref } from '../lib/phone';
import { normalizePlate } from '../lib/plates';
import { toTimestampMs } from '../lib/timestamp';
import { Check, Clock3, House, MapPin, Plane, Repeat2, TowerControl, Trophy } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { WebHaptics } from 'web-haptics';

function getSharedMarker(markers, plateValue) {
  const plateKey = normalizePlate(plateValue);
  return plateKey ? (markers?.[plateKey] ?? null) : null;
}

function getSharedMarkerColor(markers, plateValue) {
  return getSharedMarker(markers, plateValue)?.color ?? '';
}

function getSharedMarkerReturnDone(markers, plateValue) {
  return getSharedMarker(markers, plateValue)?.returnDone === true;
}

function getDisplayTime(item) {
  return String(item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim() || '--:--';
}

function isValidTimeInput(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value ?? '').trim());
}

function normalizeLocationText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeLocationLabel(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return text;
  }

  return normalizeLocationText(text) === 'aeroporto da madeira' ? 'aeroporto' : text;
}

function getLocationKind(location) {
  const normalizedLocation = normalizeLocationText(location);
  if (!normalizedLocation) {
    return '';
  }

  if (normalizedLocation.includes('aeroporto') || normalizedLocation.includes('airport')) {
    return 'airport';
  }

  if (normalizedLocation.includes('escritorio')) {
    return 'office';
  }

  return '';
}

function getClampedClientName(name) {
  const text = String(name ?? '').trim();
  if (!text) {
    return '';
  }

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) {
    return text;
  }

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleInitials = parts.slice(1, -1).map((part) => `${part[0].toUpperCase()}.`);

  return `${firstName} ${middleInitials.join(' ')} ${lastName}`.replace(/\s{2,}/g, ' ').trim();
}

function getGoogleMapsHref(location) {
  const displayLocation = String(location ?? '').trim();
  if (!displayLocation) {
    return '';
  }

  if (getLocationKind(displayLocation)) {
    return '';
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayLocation)}`;
}

const doneCardVariants = {
  active: {
    opacity: 1
  },
  done: {
    opacity: 0.9
  }
};
const MotionArticle = motion.article;
let itemDoneHaptics = null;

function triggerItemDoneHaptic() {
  try {
    itemDoneHaptics ??= new WebHaptics();
    return itemDoneHaptics.trigger('success');
  } catch {
    return Promise.resolve();
  }
}

function triggerItemUndoneHaptic() {
  try {
    itemDoneHaptics ??= new WebHaptics();
    return itemDoneHaptics.trigger('nudge');
  } catch {
    return Promise.resolve();
  }
}

function ServiceItemCard({
  item,
  status,
  readyState,
  showLastWeekWinnerMedal = false,
  sharedPlateMarkers = {},
  onSharedPlateTap,
  onToggleDone,
  onToggleReady,
  onSaveTimeOverride,
  onOpenCarHistoryFromModel,
  isUpdating = false,
  disabled
}) {
  const done = status?.done === true;
  const statusUpdatedAtMs = toTimestampMs(status?.updatedAt);
  const readyUpdatedAtMs = toTimestampMs(readyState?.updatedAt);
  const overrideUpdatedAtMs = toTimestampMs(item?.updatedAt);
  const statusUpdatedBy = status?.updatedByName || status?.updatedByEmail || '';
  const readyUpdatedBy = readyState?.updatedByName || readyState?.updatedByEmail || '';
  const overrideUpdatedBy = item?.updatedByName || item?.updatedByEmail || '';
  let updateSource = 'status';
  let latestUpdatedAtMs = statusUpdatedAtMs;

  if (readyUpdatedAtMs > latestUpdatedAtMs) {
    latestUpdatedAtMs = readyUpdatedAtMs;
    updateSource = 'ready';
  }

  if (overrideUpdatedAtMs > latestUpdatedAtMs) {
    latestUpdatedAtMs = overrideUpdatedAtMs;
    updateSource = 'override';
  }

  const updatedAt =
    updateSource === 'ready' && readyUpdatedAtMs > 0
      ? formatAuditTimestamp(readyState?.updatedAt)
      : updateSource === 'override' && overrideUpdatedAtMs > 0
        ? formatAuditTimestamp(item?.updatedAt)
        : formatAuditTimestamp(status?.updatedAt);
  const updatedBy =
    updateSource === 'ready' && readyUpdatedAtMs > 0
      ? readyUpdatedBy
      : updateSource === 'override' && overrideUpdatedAtMs > 0
        ? overrideUpdatedBy
        : statusUpdatedBy;
  const serviceLabel = item.serviceType === 'return' ? 'RECOLHA' : 'ENTREGA';
  const originalTime = String(item.time ?? '').trim() || '--:--';
  const displayTime = getDisplayTime(item);
  const phoneValue = String(item.phone ?? '').trim();
  const phoneCountryCode = useMemo(() => detectPhoneCountryCode(phoneValue), [phoneValue]);
  const phoneHref = useMemo(() => getWhatsAppHref(phoneValue), [phoneValue]);
  const hasManualOverride = Boolean(item.overrideTime) && item.overrideTime !== item.time;
  const plateKey = normalizePlate(item.plate);
  const sharedPlateMarker = plateKey ? sharedPlateMarkers[plateKey] : null;
  const isDelivery = item.serviceType === 'pickup';
  const showSharedPlateDoneBadge = isDelivery && sharedPlateMarker?.returnDone === true;
  const sharedPlateLabel = showSharedPlateDoneBadge
    ? 'Viatura com entrega e recolha nesta data; recolha concluída'
    : 'Viatura com entrega e recolha nesta data';
  const isReady = readyState?.ready === true;
  const clientDisplayName = getClampedClientName(item.name);
  const locationLabel = normalizeLocationLabel(item.location) || 'Localização não indicada';
  const accessibleClientName = clientDisplayName || item.id || item.itemId || 'Sem nome';
  const locationKind = getLocationKind(item.location);
  const locationHref = getGoogleMapsHref(item.location);
  const locationIcon =
    locationKind === 'airport' ? (
      <TowerControl className="item-location-icon is-airport" aria-hidden="true" />
    ) : locationKind === 'office' ? (
      <House className="item-location-icon is-office" aria-hidden="true" />
    ) : String(item.location ?? '').trim() ? (
      <MapPin className="item-location-icon is-default" aria-hidden="true" />
    ) : null;
  const locationContent = (
    <span className="item-location-content">
      {locationIcon}
      <span>{locationLabel}</span>
    </span>
  );
  const canToggleReady = isDelivery && Boolean(String(item.plate ?? '').trim()) && typeof onToggleReady === 'function';
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const timeMenuWrapRef = useRef(null);
  const initialEditorTime = useMemo(() => (String(item.overrideTime ?? item.time ?? '').trim() || '').slice(0, 5), [item.overrideTime, item.time]);
  const originalEditorTime = useMemo(() => (String(item.time ?? '').trim() || '').slice(0, 5), [item.time]);
  const [editTimeValue, setEditTimeValue] = useState(initialEditorTime);
  const canResetTime = hasManualOverride && isValidTimeInput(originalEditorTime);
  const controlsDisabled = disabled || isUpdating;
  const handleToggleTimeMenu = () => {
    if (controlsDisabled) {
      return;
    }

    if (timeMenuOpen) {
      setTimeMenuOpen(false);
      return;
    }

    setEditTimeValue(initialEditorTime);
    setTimeMenuOpen(true);
  };

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
    if (!onSaveTimeOverride || !editTimeValue || !isValidTimeInput(editTimeValue)) {
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

  const handleOpenCarHistory = () => {
    if (!onOpenCarHistoryFromModel || !item?.plate) {
      return;
    }

    onOpenCarHistoryFromModel(item.plate);
  };

  return (
    <MotionArticle
      layout={false}
      initial={false}
      animate={done ? 'done' : 'active'}
      variants={doneCardVariants}
      transition={{
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={`service-item ${done ? 'is-done' : ''} ${timeMenuOpen ? 'has-time-menu' : ''}`}
    >
      <div className="item-head">
        <div className="item-head-main">
          <span className="item-time">{displayTime}</span>
          {hasManualOverride ? <span className="item-time-original">{originalTime}</span> : null}
          <span className="item-service-type">{serviceLabel}</span>
        </div>

        <div className="item-actions">
          <div ref={timeMenuWrapRef} className="item-time-menu-wrap">
            <button
              type="button"
              className={`item-time-menu-trigger ${timeMenuOpen ? 'is-active' : ''}`}
              onClick={handleToggleTimeMenu}
              disabled={controlsDisabled}
              aria-label="Editar hora"
              aria-expanded={timeMenuOpen ? 'true' : 'false'}
              title="Editar hora"
            >
              <Clock3 className="item-time-menu-icon" aria-hidden="true" />
            </button>

            {timeMenuOpen ? (
              <div className="item-time-menu">
                <input
                  type="time"
                  step={60}
                  value={editTimeValue}
                  onChange={(event) => setEditTimeValue(event.target.value)}
                  disabled={controlsDisabled}
                  aria-label="Hora manual no formato 24 horas"
                />
                {!isValidTimeInput(editTimeValue) && editTimeValue ? <p className="helper-text">Formato inválido. Usa HH:mm.</p> : null}
                <button
                  type="button"
                  className="item-time-menu-save"
                  onClick={handleSaveTime}
                  disabled={controlsDisabled || !editTimeValue || !isValidTimeInput(editTimeValue)}
                >
                  Guardar
                </button>
                <button type="button" className="item-time-menu-reset" onClick={handleResetTime} disabled={controlsDisabled || !canResetTime}>
                  Reset
                </button>
                <button
                  type="button"
                  className="item-time-menu-cancel"
                  onClick={() => {
                    setEditTimeValue(initialEditorTime);
                    setTimeMenuOpen(false);
                  }}
                  disabled={controlsDisabled}
                >
                  Fechar
                </button>
              </div>
            ) : null}
          </div>

          <label className={`item-check ${done ? 'is-checked' : ''}`} aria-label={`Marcar ${accessibleClientName} como concluído`}>
            <input
              type="checkbox"
              checked={done}
              disabled={controlsDisabled}
              onChange={(event) => {
                const nextDone = event.target.checked;
                if (nextDone) {
                  void triggerItemDoneHaptic();
                } else {
                  void triggerItemUndoneHaptic();
                }
                onToggleDone(item, nextDone);
              }}
            />
            <span className="item-check-control" aria-hidden="true" />
            <span className="item-check-label">Feito</span>
          </label>
        </div>
      </div>

      <div className="item-identity-row">
        <p className="item-name">{clientDisplayName || 'Sem nome'}</p>
        <p className="item-subline">
          <span>#{item.id || 'n/a'}</span>
          {phoneValue ? (
            <span className="item-phone-inline">
              {phoneCountryCode ? (
                <span className="item-phone-flag" aria-hidden="true">
                  <ReactCountryFlag countryCode={phoneCountryCode} svg title={phoneCountryCode} style={{ width: '1rem', height: '0.74rem' }} />
                </span>
              ) : null}
              {phoneHref ? (
                <a
                  className="item-phone-link"
                  href={phoneHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir conversa no WhatsApp para ${phoneValue}`}
                >
                  <span className="item-phone-link-label">{phoneValue}</span>
                  <span className="item-phone-link-icon" aria-hidden="true">
                    <FaWhatsapp />
                  </span>
                </a>
              ) : (
                <span>{phoneValue}</span>
              )}
            </span>
          ) : (
            <span>Sem telefone</span>
          )}
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
          {item.car ? (
            <button
              type="button"
              className="item-carline-model"
              onClick={handleOpenCarHistory}
              aria-label={`Abrir histórico da viatura ${item.car}`}
              title="Ver histórico da viatura"
            >
              {item.car}
            </button>
          ) : (
            'Sem viatura'
          )}
          {item.plate ? (
            <span className="item-plate-wrap">
              {canToggleReady ? (
                <button
                  type="button"
                  className={`item-plate-button ${isReady ? 'is-ready' : ''}`}
                  onClick={() => onToggleReady(item)}
                  disabled={controlsDisabled}
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
                  title={sharedPlateLabel}
                  aria-label={sharedPlateLabel}
                  onClick={() => onSharedPlateTap?.(sharedPlateMarker)}
                >
                  <Repeat2 className="item-shared-plate-icon" aria-hidden="true" />
                  {showSharedPlateDoneBadge ? (
                    <span className="item-shared-plate-done-badge" aria-hidden="true">
                      <Check className="item-shared-plate-done-icon" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              ) : null}
            </span>
          ) : null}
        </p>
        <p className="item-location">
          {locationHref ? (
            <a className="item-location-link" href={locationHref} target="_blank" rel="noreferrer">
              {locationContent}
            </a>
          ) : (
            locationContent
          )}
        </p>
      </div>

      {Array.isArray(item.extras) && item.extras.length > 0 ? <p className="item-note item-note-extra">Extras: {item.extras.join(', ')}</p> : null}

      {item.notes ? <p className="item-note item-note-highlight">Notas: {item.notes}</p> : null}

      <footer className="item-footer">
        {updatedBy && updatedAt ? (
          <>
            <span className="item-footer-lead">Atualizado por</span>
            <span className="item-footer-updater">
              {showLastWeekWinnerMedal ? (
                <span className="item-footer-winner-pill" aria-label={`${updatedBy} venceu a semana passada`}>
                  <Trophy className="item-footer-winner-pill-icon" aria-hidden="true" />
                  <span className="item-footer-winner-pill-name">{updatedBy}</span>
                </span>
              ) : (
                <span className="item-footer-updater-name">{updatedBy}</span>
              )}
            </span>
            <span className="item-footer-time">às {updatedAt}</span>
          </>
        ) : (
          'Sem atualização de equipa'
        )}
      </footer>
    </MotionArticle>
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

  if (prevProps.isUpdating !== nextProps.isUpdating) {
    return false;
  }

  if (prevProps.showLastWeekWinnerMedal !== nextProps.showLastWeekWinnerMedal) {
    return false;
  }

  if (
    prevProps.onToggleDone !== nextProps.onToggleDone ||
    prevProps.onSharedPlateTap !== nextProps.onSharedPlateTap ||
    prevProps.onToggleReady !== nextProps.onToggleReady ||
    prevProps.onSaveTimeOverride !== nextProps.onSaveTimeOverride ||
    prevProps.onOpenCarHistoryFromModel !== nextProps.onOpenCarHistoryFromModel
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
    getSharedMarkerColor(prevProps.sharedPlateMarkers, prevItem.plate) === getSharedMarkerColor(nextProps.sharedPlateMarkers, nextItem.plate) &&
    getSharedMarkerReturnDone(prevProps.sharedPlateMarkers, prevItem.plate) === getSharedMarkerReturnDone(nextProps.sharedPlateMarkers, nextItem.plate)
  );
}

export default memo(ServiceItemCard, areSameItemProps);
