import { RotateCw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAndCacheReservation, readCachedReservation } from '../../lib/reservationDetailsCache';
import ReservationDetailsPopup from '../reservations/ReservationDetailsPopup';

export default function ServiceReservationPopup({ reference, onClose, canManageAccess = false }) {
  const [state, setState] = useState(() => {
    const cachedReservation = readCachedReservation(reference);
    return cachedReservation
      ? { status: 'success', reservation: cachedReservation, isRefreshing: true }
      : { status: 'loading', reservation: null, isRefreshing: false };
  });
  const requestIdRef = useRef(0);

  const loadReservation = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState((current) => current.reservation
      ? { ...current, status: 'success', isRefreshing: true }
      : { status: 'loading', reservation: null, isRefreshing: false });

    try {
      const reservation = await fetchAndCacheReservation(reference);
      if (requestIdRef.current === requestId) {
        setState({ status: 'success', reservation, isRefreshing: false });
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setState((current) => current.reservation
          ? { ...current, status: 'success', isRefreshing: false }
          : { status: 'error', reservation: null, isRefreshing: false });
      }
    }
  }, [reference]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    fetchAndCacheReservation(reference)
      .then((reservation) => {
        if (requestIdRef.current === requestId) {
          setState({ status: 'success', reservation, isRefreshing: false });
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          setState((current) => current.reservation
            ? { ...current, status: 'success', isRefreshing: false }
            : { status: 'error', reservation: null, isRefreshing: false });
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [reference]);

  if (state.status === 'success') {
    return (
      <ReservationDetailsPopup
        reservation={state.reservation}
        onClose={onClose}
        canManageAccess={canManageAccess}
        isRefreshing={state.isRefreshing}
      />
    );
  }

  const isLoading = state.status === 'loading';
  const dialogLabel = isLoading ? `A carregar reserva ${reference}` : `Erro ao carregar reserva ${reference}`;

  return (
    <div
      className="reservation-details-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="reservation-details-popup reservation-details-state-popup" role="dialog" aria-modal="true" aria-label={dialogLabel}>
        <header className="reservation-details-header">
          <div>
            <span>Ficha</span>
            <h2>Reserva {reference}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar detalhes da reserva">
            <X aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <div className="reservation-details-loading" aria-live="polite">
            <p>A carregar informação da reserva…</p>
            <div className="reservation-details-loading-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className="reservation-details-error" role="alert">
            <p>Não foi possível carregar a reserva.</p>
            <button type="button" onClick={loadReservation}>
              <RotateCw aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
