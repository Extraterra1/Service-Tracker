import { memo, useEffect, useMemo, useRef, useState } from 'react';
import ServiceItemCard from './ServiceItemCard';
import { toTimestampMs } from '../lib/timestamp';

const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000;
const COMPLETED_ACCORDION_ANIMATION_MS = 380;

function toSortMinutes(item) {
  const value = String(item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim();
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function ServicePane({
  title,
  items,
  statusMap,
  readyMap = {},
  nowMs = 0,
  sharedPlateMarkers,
  onSharedPlateTap,
  onToggleDone,
  onToggleReady,
  onSaveTimeOverride,
  updatingItemId = '',
  disabled,
  loading = false,
  canShowEmptyState = true,
  lockedMessage = ''
}) {
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isCompletedClosing, setIsCompletedClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const resolvedNowMs = Number.isFinite(nowMs) ? nowMs : 0;

  const { activeItems, completedItems } = useMemo(() => {
    const sortedItems = items
      .map((item, index) => ({
        item,
        index,
        sortMinutes: toSortMinutes(item)
      }))
      .sort((a, b) => {
        const aHasTime = a.sortMinutes !== null;
        const bHasTime = b.sortMinutes !== null;

        if (aHasTime && bHasTime && a.sortMinutes !== b.sortMinutes) {
          return a.sortMinutes - b.sortMinutes;
        }

        if (aHasTime !== bHasTime) {
          return aHasTime ? -1 : 1;
        }

        return a.index - b.index;
      })
      .map((entry) => entry.item);

    const active = [];
    const completed = [];

    sortedItems.forEach((item) => {
      const status = statusMap[item.itemId];
      const isDone = status?.done === true;

      if (!isDone) {
        active.push(item);
        return;
      }

      const updatedAtMs = toTimestampMs(status?.updatedAt, null);
      const isOlderThanOneHour = updatedAtMs !== null && resolvedNowMs - updatedAtMs > COMPLETED_HIDE_AFTER_MS;

      if (isOlderThanOneHour) {
        completed.push(item);
      } else {
        active.push(item);
      }
    });

    return { activeItems: active, completedItems: completed };
  }, [items, resolvedNowMs, statusMap]);

  const hasAnyItems = activeItems.length > 0 || completedItems.length > 0;
  const showLockedState = !loading && Boolean(lockedMessage);
  const shouldRenderCompletedAccordion = !loading && !showLockedState && completedItems.length > 0;

  useEffect(() => {
    if (shouldRenderCompletedAccordion || isCompletedClosing) {
      return;
    }

    setIsCompletedOpen(false);
  }, [isCompletedClosing, shouldRenderCompletedAccordion]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  const handleCompletedAccordionToggle = (event) => {
    event.preventDefault();

    if (isCompletedClosing) {
      return;
    }

    if (isCompletedOpen) {
      setIsCompletedClosing(true);

      closeTimerRef.current = window.setTimeout(() => {
        setIsCompletedOpen(false);
        setIsCompletedClosing(false);
        closeTimerRef.current = null;
      }, COMPLETED_ACCORDION_ANIMATION_MS);

      return;
    }

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsCompletedOpen(true);
  };

  return (
    <section className="service-pane" aria-label={title} aria-busy={loading ? 'true' : 'false'}>
      <header className="pane-header">
        <h2>{title}</h2>
        <span>{loading ? '...' : items.length}</span>
      </header>

      <div className={`pane-list ${showLockedState ? 'pane-list-locked' : ''}`}>
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={`skeleton-${title}-${index}`} className="service-item service-item-skeleton" aria-hidden="true">
                <div className="skeleton-line skeleton-line-time" />
                <div className="skeleton-line skeleton-line-name" />
                <div className="skeleton-line skeleton-line-sub" />
                <div className="skeleton-line skeleton-line-sub" />
                <div className="skeleton-line skeleton-line-footer" />
              </article>
            ))}
          </>
        ) : null}

        {showLockedState ? (
          <div className="pane-locked-state">
            <p className="empty-state empty-state-locked">{lockedMessage}</p>
          </div>
        ) : null}

        {shouldRenderCompletedAccordion ? (
          <details className={`completed-accordion ${isCompletedClosing ? 'is-closing' : ''}`} open={isCompletedOpen || isCompletedClosing}>
            <summary onClick={handleCompletedAccordionToggle}>Finalizados ({completedItems.length})</summary>
            <div className="completed-list">
              {completedItems.map((item) => (
                <ServiceItemCard
                  key={item.itemId}
                  item={item}
                  status={statusMap[item.itemId]}
                  readyState={readyMap[item.itemId]}
                  sharedPlateMarkers={sharedPlateMarkers}
                  onSharedPlateTap={onSharedPlateTap}
                  onToggleDone={onToggleDone}
                  onToggleReady={onToggleReady}
                  onSaveTimeOverride={onSaveTimeOverride}
                  isUpdating={updatingItemId === item.itemId}
                  disabled={disabled}
                />
              ))}
            </div>
          </details>
        ) : null}

        {!loading && !showLockedState && canShowEmptyState && !hasAnyItems ? <p className="empty-state">Sem serviços para esta data.</p> : null}

        {!loading && !showLockedState && hasAnyItems && activeItems.length === 0 ? (
          <p className="empty-state">Sem serviços ativos. Consulta "Finalizados".</p>
        ) : null}

        {!loading &&
          !showLockedState &&
          activeItems.map((item) => (
            <ServiceItemCard
              key={item.itemId}
              item={item}
              status={statusMap[item.itemId]}
              readyState={readyMap[item.itemId]}
              sharedPlateMarkers={sharedPlateMarkers}
              onSharedPlateTap={onSharedPlateTap}
              onToggleDone={onToggleDone}
              onToggleReady={onToggleReady}
              onSaveTimeOverride={onSaveTimeOverride}
              isUpdating={updatingItemId === item.itemId}
              disabled={disabled}
            />
          ))}
      </div>
    </section>
  );
}

export default memo(ServicePane);
