import { RotateCw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchReservationDetails } from '../../lib/reservationsApi';
import ReservationDetailsPopup from '../reservations/ReservationDetailsPopup';

export default function ServiceReservationPopup({ reference, onClose }) {
  const [state, setState] = useState({ status: 'loading', reservation: null });
  const requestIdRef = useRef(0);

  const loadReservation = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ status: 'loading', reservation: null });

    try {
      const reservation = await fetchReservationDetails(reference);
      if (requestIdRef.current === requestId) {
        setState({ status: 'success', reservation });
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setState({ status: 'error', reservation: null });
      }
    }
  }, [reference]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    fetchReservationDetails(reference)
      .then((reservation) => {
        if (requestIdRef.current === requestId) {
          setState({ status: 'success', reservation });
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          setState({ status: 'error', reservation: null });
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [reference]);

  if (state.status === 'success') {
    return <ReservationDetailsPopup reservation={state.reservation} onClose={onClose} />;
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
