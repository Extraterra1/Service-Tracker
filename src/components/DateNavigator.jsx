import { addDays, formatDateLabel, getTodayDate } from '../lib/date'

function DateNavigator({
  date,
  onDateChange,
  onManualRefresh,
  forceRefresh,
  onForceRefreshChange,
  loading,
}) {
  return (
    <section className="toolbar" aria-label="Date controls">
      <div className="toolbar-row">
        <button type="button" className="ghost-btn" onClick={() => onDateChange(addDays(date, -1))}>
          Dia anterior
        </button>
        <button type="button" className="ghost-btn" onClick={() => onDateChange(getTodayDate())}>
          Hoje
        </button>
        <button type="button" className="ghost-btn" onClick={() => onDateChange(addDays(date, 1))}>
          Próximo dia
        </button>
      </div>

      <div className="toolbar-row toolbar-row-tight">
        <label className="field-inline" htmlFor="service-date">
          Data
          <input
            id="service-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>

        <button type="button" className="primary-btn" onClick={onManualRefresh} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>

      <div className="toolbar-row toolbar-row-between">
        <p className="date-label">{formatDateLabel(date)}</p>
        <label className="checkbox-inline" htmlFor="force-refresh">
          <input
            id="force-refresh"
            type="checkbox"
            checked={forceRefresh}
            onChange={(event) => onForceRefreshChange(event.target.checked)}
          />
          Forçar atualização da origem
        </label>
      </div>
    </section>
  )
}

export default DateNavigator
