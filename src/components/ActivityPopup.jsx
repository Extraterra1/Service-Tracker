import { toDateValue } from '../lib/timestamp';

function ActivityPopup({ selectedDate, loadingActivity, activityEntries, activityTimeFormatter, onClose }) {
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
              const reservationLabel = entry.reservationId ? `#${entry.reservationId}` : `#${entry.itemId}`;
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
              const plateLabel = entry.plate || 'Sem matrícula';
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
                  {isTimeChange ? (
                    <p className="activity-popup-meta">
                      {itemLabel} · {reservationLabel} · {oldTimeLabel} → {newTimeLabel} · {actionTimeLabel}
                    </p>
                  ) : isReadyToggle ? (
                    <p className="activity-popup-meta">
                      {itemLabel} · {reservationLabel} · {plateLabel} · {actionTimeLabel}
                    </p>
                  ) : (
                    <p className="activity-popup-meta">
                      {itemLabel} · {reservationLabel} · {entry.itemTime || '--:--'} · {actionTimeLabel}
                    </p>
                  )}
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
