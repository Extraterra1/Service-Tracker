import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { addDays, getTodayDate } from '../lib/date';

function DateNavigator({
  date,
  onDateChange,
  onManualRefresh,
  loading,
  showRefresh = true,
  minimumDate = '',
  presetDate = getTodayDate(),
  presetLabel = 'Hoje'
}) {
  const clampDate = (nextDate) => (minimumDate && nextDate < minimumDate ? minimumDate : nextDate);
  const previousDate = addDays(date, -1);

  return (
    <section className="toolbar toolbar-compact" aria-label="Date controls">
      <div className="toolbar-line">
        <div className="date-control-group" aria-label="Selecionar dia de serviço">
          <button
            type="button"
            className="ghost-btn compact-btn date-step-btn"
            onClick={() => onDateChange(clampDate(previousDate))}
            aria-label="Dia anterior"
            disabled={Boolean(minimumDate && previousDate < minimumDate)}
          >
            <ChevronLeft className="toolbar-icon" aria-hidden="true" />
          </button>

          <button type="button" className="ghost-btn compact-btn today-btn" onClick={() => onDateChange(clampDate(presetDate))}>
            {presetLabel}
          </button>

          <label className="field-inline field-inline-date" htmlFor="service-date">
            <span className="sr-only">Selecionar data</span>
            <input id="service-date" type="date" value={date} min={minimumDate || undefined} onChange={(event) => onDateChange(clampDate(event.target.value))} />
          </label>

          <button type="button" className="ghost-btn compact-btn date-step-btn" onClick={() => onDateChange(addDays(date, 1))} aria-label="Dia seguinte">
            <ChevronRight className="toolbar-icon" aria-hidden="true" />
          </button>
        </div>

        {showRefresh ? (
          <button type="button" className="primary-btn compact-btn refresh-btn" onClick={onManualRefresh} disabled={loading} aria-label={loading ? 'A atualizar lista' : 'Atualizar lista'}>
            <RefreshCw className={`toolbar-icon refresh-icon ${loading ? 'is-loading' : ''}`} aria-hidden="true" />
            <span className="refresh-btn-label">{loading ? 'A atualizar...' : 'Atualizar'}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default DateNavigator;
