import ServiceItemCard from './ServiceItemCard'

function ServicePane({ title, items, statusMap, onToggleDone, disabled }) {
  return (
    <section className="service-pane" aria-label={title}>
      <header className="pane-header">
        <h2>{title}</h2>
        <span>{items.length}</span>
      </header>

      <div className="pane-list">
        {items.length === 0 ? (
          <p className="empty-state">Sem serviços para esta data.</p>
        ) : (
          items.map((item) => (
            <ServiceItemCard
              key={item.itemId}
              item={item}
              status={statusMap[item.itemId]}
              onToggleDone={onToggleDone}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default ServicePane
