import './TabBar.css'

export function TabBar({ tabs, activeTabId, onChange, className = '' }) {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId)
  const trackStyle = {
    '--primary-tab-count': tabs.length,
    '--primary-tab-index': Math.max(activeIndex, 0),
    '--primary-tab-indicator-opacity': activeIndex >= 0 ? 1 : 0,
  }

  return (
    <nav className={`primary-tab-bar ${className}`.trim()} aria-label="Navegação principal">
      <div className="primary-tab-track" style={trackStyle}>
        <span className="primary-tab-indicator" aria-hidden="true" />
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              className={`primary-tab-button ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
            >
              <Icon size={22} strokeWidth={isActive ? 2.35 : 1.9} aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.badge ? <span className="primary-tab-badge">{tab.badge}</span> : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
