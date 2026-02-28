import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import ServicePane from '../../components/ServicePane';

function normalizePlate(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getPlateColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 78% 42%)`;
}

function uniqueTimes(items) {
  const seen = new Set();
  const output = [];

  items.forEach((value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    output.push(normalized);
  });

  return output;
}

function getItemDisplayTime(item) {
  return String(item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim()
}

function ServiceWorkspace({
  serviceData,
  statusMap,
  readyMap,
  onToggleDone,
  onToggleReady,
  onSaveTimeOverride,
  updatingItemId = '',
  disabled,
  loading = false,
  canShowEmptyState = true,
  lockedMessage = ''
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [plateInfoPopup, setPlateInfoPopup] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const sharedPlateMarkers = useMemo(() => {
    const pickupByPlate = new Map();
    const returnByPlate = new Map();
    const plateLabelByKey = new Map();

    serviceData.pickups.forEach((item) => {
      const plate = normalizePlate(item.plate);
      if (!plate) {
        return;
      }

      if (!plateLabelByKey.has(plate) && item.plate) {
        plateLabelByKey.set(plate, String(item.plate).trim().toUpperCase());
      }

      const nextTimes = pickupByPlate.get(plate) ?? [];
      nextTimes.push(getItemDisplayTime(item));
      pickupByPlate.set(plate, nextTimes);
    });

    serviceData.returns.forEach((item) => {
      const plate = normalizePlate(item.plate);
      if (!plate) {
        return;
      }

      if (!plateLabelByKey.has(plate) && item.plate) {
        plateLabelByKey.set(plate, String(item.plate).trim().toUpperCase());
      }

      const nextTimes = returnByPlate.get(plate) ?? [];
      nextTimes.push(getItemDisplayTime(item));
      returnByPlate.set(plate, nextTimes);
    });

    const shared = [...pickupByPlate.keys()].filter((plate) => returnByPlate.has(plate)).sort((a, b) => a.localeCompare(b));

    return shared.reduce((acc, plate, index) => {
      acc[plate] = {
        plate,
        displayPlate: plateLabelByKey.get(plate) ?? plate,
        color: getPlateColor(index),
        pickupTimes: uniqueTimes(pickupByPlate.get(plate) ?? []),
        returnTimes: uniqueTimes(returnByPlate.get(plate) ?? [])
      };
      return acc;
    }, {});
  }, [serviceData.pickups, serviceData.returns]);

  const activePlateInfoPopup = useMemo(() => {
    if (!plateInfoPopup) {
      return null;
    }

    const plateKey = normalizePlate(plateInfoPopup.plate);
    if (!plateKey) {
      return null;
    }

    return sharedPlateMarkers[plateKey] ?? null;
  }, [plateInfoPopup, sharedPlateMarkers]);

  const handleShowPlateInfo = useCallback((marker) => {
    if (!marker) {
      return;
    }

    setPlateInfoPopup(marker);
  }, []);

  const handleHidePlateInfo = useCallback(() => {
    setPlateInfoPopup(null);
  }, []);

  return (
    <>
      <main className="service-grid">
        <ServicePane
          title="Entregas"
          items={serviceData.pickups}
          statusMap={statusMap}
          readyMap={readyMap}
          nowMs={nowMs}
          sharedPlateMarkers={sharedPlateMarkers}
          onSharedPlateTap={handleShowPlateInfo}
          onToggleDone={onToggleDone}
          onToggleReady={onToggleReady}
          onSaveTimeOverride={onSaveTimeOverride}
          updatingItemId={updatingItemId}
          disabled={disabled}
          loading={loading}
          canShowEmptyState={canShowEmptyState}
          lockedMessage={lockedMessage}
        />

        <ServicePane
          title="Recolhas"
          items={serviceData.returns}
          statusMap={statusMap}
          readyMap={readyMap}
          nowMs={nowMs}
          sharedPlateMarkers={sharedPlateMarkers}
          onSharedPlateTap={handleShowPlateInfo}
          onToggleDone={onToggleDone}
          onToggleReady={onToggleReady}
          onSaveTimeOverride={onSaveTimeOverride}
          updatingItemId={updatingItemId}
          disabled={disabled}
          loading={loading}
          canShowEmptyState={canShowEmptyState}
          lockedMessage={lockedMessage}
        />
      </main>

      {activePlateInfoPopup ? (
        <div
          className="plate-popup-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleHidePlateInfo();
            }
          }}
        >
          <section className="plate-popup" role="dialog" aria-modal="true" aria-label="Horários da viatura">
            <header className="plate-popup-header">
              <div>
                <p className="plate-popup-kicker">Movimento da Viatura</p>
                <h3>{activePlateInfoPopup.displayPlate ?? activePlateInfoPopup.plate}</h3>
              </div>
              <button type="button" className="plate-popup-close" onClick={handleHidePlateInfo} aria-label="Fechar pop-up">
                ✕
              </button>
            </header>

            <p className="plate-popup-hint">Horários desta viatura no dia selecionado.</p>

            <div className="plate-popup-grid">
              <article className="plate-popup-card plate-popup-card-return">
                <p className="plate-popup-card-label">RECOLHA</p>
                <p className="plate-popup-card-sub">Entra</p>
                <div className="plate-popup-times">
                  {activePlateInfoPopup.returnTimes?.length > 0 ? (
                    activePlateInfoPopup.returnTimes.map((time) => (
                      <span key={`out-${activePlateInfoPopup.plate}-${time}`} className="plate-popup-time-chip">
                        {time}
                      </span>
                    ))
                  ) : (
                    <span className="plate-popup-empty">Sem hora definida</span>
                  )}
                </div>
              </article>

              <article className="plate-popup-card plate-popup-card-delivery">
                <p className="plate-popup-card-label">ENTREGA</p>
                <p className="plate-popup-card-sub">Sai</p>
                <div className="plate-popup-times">
                  {activePlateInfoPopup.pickupTimes?.length > 0 ? (
                    activePlateInfoPopup.pickupTimes.map((time) => (
                      <span key={`in-${activePlateInfoPopup.plate}-${time}`} className="plate-popup-time-chip">
                        {time}
                      </span>
                    ))
                  ) : (
                    <span className="plate-popup-empty">Sem hora definida</span>
                  )}
                </div>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default memo(ServiceWorkspace);
