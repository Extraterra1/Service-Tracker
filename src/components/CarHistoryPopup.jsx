import { useMemo, useState } from 'react';

function getServiceLabel(serviceType) {
  return serviceType === 'return' ? 'Recolha' : 'Entrega';
}

function CarHistoryPopup({ loading, error, plateOptions, entriesByPlate, rangeStart, rangeEnd, onClose }) {
  const [selectedPlateKeyState, setSelectedPlateKeyState] = useState('');
  const selectedPlateKey = useMemo(() => {
    if (plateOptions.some((option) => option.value === selectedPlateKeyState)) {
      return selectedPlateKeyState;
    }

    return plateOptions[0]?.value ?? '';
  }, [plateOptions, selectedPlateKeyState]);
  const selectedPlateLabel = plateOptions.find((option) => option.value === selectedPlateKey)?.label ?? selectedPlateKey;
  const selectedEntries = selectedPlateKey ? entriesByPlate[selectedPlateKey] ?? [] : [];

  return (
    <div
      className="car-history-popup-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="car-history-popup" role="dialog" aria-modal="true" aria-label="Histórico de viaturas">
        <header className="car-history-popup-header">
          <div>
            <p className="car-history-popup-kicker">Histórico de Viaturas</p>
            <h3>{selectedPlateLabel || 'Selecionar matrícula'}</h3>
          </div>
          <button type="button" className="car-history-popup-close" onClick={onClose} aria-label="Fechar histórico de viaturas">
            ✕
          </button>
        </header>

        <p className="car-history-popup-hint">Janela: {rangeStart && rangeEnd ? `${rangeStart} a ${rangeEnd}` : '--'}</p>

        {loading ? (
          <p className="helper-text">A carregar histórico...</p>
        ) : error ? (
          <p className="helper-text">{error}</p>
        ) : plateOptions.length === 0 ? (
          <p className="helper-text">Sem histórico de viaturas para esta janela.</p>
        ) : (
          <>
            <label className="sr-only" htmlFor="car-history-plate">
              Selecionar matrícula
            </label>
            <select
              id="car-history-plate"
              className="manual-completed-select car-history-popup-select"
              value={selectedPlateKey}
              onChange={(event) => setSelectedPlateKeyState(event.target.value)}
              aria-label="Selecionar matrícula"
            >
              {plateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <ul className="car-history-popup-list">
              {selectedEntries.map((entry) => (
                <li key={entry.id} className="car-history-popup-item">
                  <div className="car-history-popup-row car-history-popup-row-head">
                    <span className="car-history-popup-date">{entry.date}</span>
                    <span className={`car-history-popup-service is-${entry.serviceType === 'return' ? 'return' : 'pickup'}`}>
                      {getServiceLabel(entry.serviceType)}
                    </span>
                    <span className="car-history-popup-time">{entry.effectiveTime}</span>
                  </div>
                  <div className="car-history-popup-row car-history-popup-row-body">
                    <span className="car-history-popup-client">{entry.clientName}</span>
                    <span className="car-history-popup-reservation">{entry.reservationId}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

export default CarHistoryPopup;
