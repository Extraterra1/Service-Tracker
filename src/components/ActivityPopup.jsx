import { toDateValue } from '../lib/timestamp';

function ActivityPopup({ selectedDate, loadingActivity, activityEntries, plateByItemId = {}, activityTimeFormatter, onClose }) {
  return (
    <div
      className="activity-popup-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="activity-popup" role="dialog" aria-modal="true" aria-label="Atividade do dia">
        <header className="activity-popup-header">
          <div>
            <p className="activity-popup-kicker">Atividade do Dia</p>
            <h3>{selectedDate}</h3>
          </div>
          <button type="button" className="activity-popup-close" onClick={onClose} aria-label="Fechar atividade">
            ✕
          </button>
        </header>

        {loadingActivity ? (
          <p className="helper-text">A carregar atividade...</p>
        ) : activityEntries.length === 0 ? (
          <p className="helper-text">Sem atividade registada para este dia.</p>
        ) : (
          <ul className="activity-popup-list">
            {activityEntries.map((entry) => {
              const actionTime = toDateValue(entry.createdAt);
              const actionTimeLabel = actionTime ? activityTimeFormatter.format(actionTime) : '--/-- --:--';
              const updatedBy = entry.updatedByName || entry.updatedByEmail || 'Equipa';
              const serviceLabel = entry.serviceType === 'return' ? 'Recolha' : 'Entrega';
              const itemLabel = entry.itemName || `Serviço ${entry.itemId}`;
              const isTimeChange = entry.actionType === 'time_change';
              const isReadyToggle = entry.actionType === 'ready_toggle';
              const actionLabel = isTimeChange
                ? 'alterou hora'
                : isReadyToggle
                  ? entry.ready
                    ? 'viatura pronta'
                    : 'viatura não pronta'
                  : entry.done
                    ? 'fez'
                    : 'desfez';
              const oldTimeLabel = entry.oldTime || '--:--';
              const newTimeLabel = entry.newTime || entry.itemTime || '--:--';
              const fallbackPlate = plateByItemId[entry.itemId] || '';
              const plateLabel = entry.plate || fallbackPlate || 'Sem matrícula';
              const metaLabel = isTimeChange
                ? [itemLabel, plateLabel, `${oldTimeLabel} → ${newTimeLabel}`, actionTimeLabel].join(' · ')
                : isReadyToggle
                  ? [itemLabel, plateLabel, actionTimeLabel].join(' · ')
                  : [itemLabel, plateLabel, entry.itemTime || '--:--', actionTimeLabel].join(' · ');
              const actionClass = isTimeChange
                ? 'is-time'
                : isReadyToggle
                  ? entry.ready
                    ? 'is-ready-on'
                    : 'is-ready-off'
                  : entry.done
                    ? 'is-done'
                    : 'is-undone';

              return (
                <li key={`popup-activity-${entry.id}`} className="activity-popup-item">
                  <p className="activity-popup-main">
                    <strong>{updatedBy}</strong> <span className={`menu-activity-action ${actionClass}`}>{actionLabel}</span> {serviceLabel}
                  </p>
                  <p className="activity-popup-meta">{metaLabel}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ActivityPopup;
