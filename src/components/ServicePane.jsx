import { memo, useMemo } from 'react'
import ServiceItemCard from './ServiceItemCard'

const COMPLETED_HIDE_AFTER_MS = 60 * 60 * 1000

function toMillis(timestampLike) {
  if (!timestampLike) {
    return null
  }

  if (typeof timestampLike.toDate === 'function') {
    return timestampLike.toDate().getTime()
  }

  if (typeof timestampLike.seconds === 'number') {
    return timestampLike.seconds * 1000
  }

  const parsed = new Date(timestampLike)
  const value = parsed.getTime()
  return Number.isNaN(value) ? null : value
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
  disabled,
  loading = false,
  canShowEmptyState = true,
  lockedMessage = '',
}) {
  const resolvedNowMs = Number.isFinite(nowMs) ? nowMs : 0

  const { activeItems, completedItems } = useMemo(() => {
    const active = []
    const completed = []

    items.forEach((item) => {
      const status = statusMap[item.itemId]
      const isDone = status?.done === true

      if (!isDone) {
        active.push(item)
        return
      }

      const updatedAtMs = toMillis(status?.updatedAt)
      const isOlderThanOneHour = updatedAtMs !== null && resolvedNowMs - updatedAtMs > COMPLETED_HIDE_AFTER_MS

      if (isOlderThanOneHour) {
        completed.push(item)
      } else {
        active.push(item)
      }
    })

    return { activeItems: active, completedItems: completed }
  }, [items, resolvedNowMs, statusMap])

  const hasAnyItems = activeItems.length > 0 || completedItems.length > 0
  const showLockedState = !loading && Boolean(lockedMessage)

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

        {!loading && !showLockedState && completedItems.length > 0 ? (
          <details className="completed-accordion">
            <summary>Completados ({completedItems.length})</summary>
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
                  disabled={disabled}
                />
              ))}
            </div>
          </details>
        ) : null}

        {!loading && !showLockedState && canShowEmptyState && !hasAnyItems ? <p className="empty-state">Sem serviços para esta data.</p> : null}

        {!loading && !showLockedState && hasAnyItems && activeItems.length === 0 ? <p className="empty-state">Sem serviços ativos. Consulta "Completados".</p> : null}

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
              disabled={disabled}
            />
          ))}
      </div>
    </section>
  )
}

export default memo(ServicePane)
