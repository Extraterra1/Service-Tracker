import { addDays, getTodayDate } from '../lib/date';

function DateNavigator({ date, onDateChange, onManualRefresh, forceRefresh, onForceRefreshChange, loading }) {
  return (
    <section className="toolbar toolbar-compact" aria-label="Date controls">
      <div className="toolbar-line">
        <button type="button" className="ghost-btn compact-btn" onClick={() => onDateChange(addDays(date, -1))}>
          ◀
        </button>

        <button type="button" className="ghost-btn compact-btn" onClick={() => onDateChange(getTodayDate())}>
          Hoje
        </button>

        <label className="field-inline field-inline-date" htmlFor="service-date">
          <input id="service-date" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>

        <button type="button" className="ghost-btn compact-btn" onClick={() => onDateChange(addDays(date, 1))}>
          ▶
        </button>

        <label className="checkbox-inline compact-checkbox" htmlFor="force-refresh">
          <input id="force-refresh" type="checkbox" checked={forceRefresh} onChange={(event) => onForceRefreshChange(event.target.checked)} />
          Forçar
        </label>

        <button type="button" className="primary-btn compact-btn" onClick={onManualRefresh} disabled={loading}>
          {loading ? 'A atualizar...' : 'Atualizar'}
        </button>
      </div>
    </section>
  );
}

export default DateNavigator;
