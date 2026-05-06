import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { addDays, getTodayDate } from '../lib/date';

function DateNavigator({ date, onDateChange, onManualRefresh, loading }) {
  return (
    <section className="toolbar toolbar-compact" aria-label="Date controls">
      <div className="toolbar-line">
        <div className="date-control-group" aria-label="Selecionar dia de serviço">
          <button type="button" className="ghost-btn compact-btn date-step-btn" onClick={() => onDateChange(addDays(date, -1))} aria-label="Dia anterior">
            <ChevronLeft className="toolbar-icon" aria-hidden="true" />
          </button>

          <button type="button" className="ghost-btn compact-btn today-btn" onClick={() => onDateChange(getTodayDate())}>
            Hoje
          </button>

          <label className="field-inline field-inline-date" htmlFor="service-date">
            <span className="sr-only">Selecionar data</span>
            <input id="service-date" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
          </label>

          <button type="button" className="ghost-btn compact-btn date-step-btn" onClick={() => onDateChange(addDays(date, 1))} aria-label="Dia seguinte">
            <ChevronRight className="toolbar-icon" aria-hidden="true" />
          </button>
        </div>

        <button type="button" className="primary-btn compact-btn refresh-btn" onClick={onManualRefresh} disabled={loading}>
          <RefreshCw className={`toolbar-icon refresh-icon ${loading ? 'is-loading' : ''}`} aria-hidden="true" />
          <span>{loading ? 'A atualizar...' : 'Atualizar'}</span>
        </button>
      </div>
    </section>
  );
}

export default DateNavigator;
