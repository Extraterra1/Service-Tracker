import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, Clock3, ExternalLink, Eye, Plane, PlaneLanding, RefreshCw } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { FaWhatsapp } from 'react-icons/fa';

import { detectPhoneCountryCode, getWhatsAppHref } from '../../lib/phone';
import {
  doesFutureFlightCacheMatch,
  getFutureFlightMemoryCache,
  isFutureFlightCacheFresh,
  saveFutureFlightCache,
  subscribeToFutureFlightDay,
  tryAcquireFutureFlightRefreshLease,
} from '../../lib/futureFlightCacheStore';
import { toTimestampMs } from '../../lib/timestamp';
import { scheduleWhatsAppHrefFallback } from '../../lib/whatsappLinks';
import { fetchFlightArrivals } from './flightsApi';
import { getPickupFlightNumbers, normalizeFlightNumber } from './flightNumbers';
import { sortFutureFlightsByScheduledArrival } from './flightSorting';
import FlightsWorkspaceSkeleton from './FlightsWorkspaceSkeleton';
import { getAirlineBrand } from './airlineBrands';

const STATUS_LABELS = {
  planned: 'Planeado',
  scheduled: 'Programado',
  departed: 'No ar',
  arrived: 'Chegou',
  delayed: 'Atrasado',
  estimated: 'Estimado',
  cancelled: 'Cancelado',
  canceled: 'Cancelado',
  diverted: 'Desviado',
  unknown: 'Desconhecido'
};

const ERROR_LABELS = {
  not_found: 'Voo não encontrado',
  invalid_flight_number: 'Número de voo inválido',
  flight_checker_unavailable: 'FR24 temporariamente indisponível',
  ambiguous_match: 'Foram encontrados vários voos possíveis',
  flightview_unavailable: 'FlightView temporariamente indisponível',
  parse_failed: 'Não foi possível interpretar os dados do voo'
};

function formatTime(value) {
  const match = String(value ?? '').match(/(?:T|\s|^)([01]\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1]}:${match[2]}` : '--:--';
}

function localizeStatus(status) {
  const normalized = String(status ?? '').trim();
  if (!normalized) return STATUS_LABELS.unknown;
  return STATUS_LABELS[normalized.toLowerCase()] ?? normalized;
}

function getSafeSourceUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' && url.hostname === 'www.flightview.com' ? url.href : '';
  } catch {
    return '';
  }
}

function FlightTime({ label, value }) {
  return (
    <div className="flight-time">
      <dt>{label}</dt>
      <dd>{formatTime(value)}</dd>
    </div>
  );
}

function FlightClient({ client, onOpenReservation, showReservationTime = false }) {
  const name = String(client?.name ?? '').trim() || '—';
  const car = String(client?.car ?? '').trim() || '—';
  const plate =
    String(client?.plate ?? '')
      .trim()
      .toUpperCase() || '—';
  const phone = String(client?.phone ?? '').trim();
  const countryCode = detectPhoneCountryCode(phone);
  const whatsappUrl = getWhatsAppHref(phone);
  const reservationId = String(client?.id ?? '').trim();
  const clientRest = (
    <>
      <span className="flight-client-detail">
        <small>Carro</small>
        {car}
      </span>
      <span className="flight-client-detail flight-client-plate">
        <small>Matrícula</small>
        {plate}
      </span>
      <div className="flight-client-actions">
        {whatsappUrl ? (
          <a className="flight-client-phone" href={whatsappUrl} onClick={() => scheduleWhatsAppHrefFallback(whatsappUrl)} aria-label={`WhatsApp ${phone}`}>
            <FaWhatsapp aria-hidden="true" />
            <span>{phone}</span>
          </a>
        ) : (
          <span className="flight-client-phone flight-client-phone--disabled">{phone || '—'}</span>
        )}
        {reservationId ? (
          <button
            type="button"
            className="flight-client-reservation"
            onClick={() => onOpenReservation?.(reservationId)}
            aria-label={`Reservations ${reservationId}`}
          >
            <span>#{reservationId}</span>
            <Eye aria-hidden="true" />
          </button>
        ) : (
          <span className="flight-client-reservation flight-client-reservation--disabled">—</span>
        )}
      </div>
    </>
  );

  return (
    <div className={`flight-client ${showReservationTime ? 'flight-client--time-aligned' : ''}`} data-testid="flight-client">
      <div className="flight-client-identity">
        <span className="flight-client-flag">{countryCode ? <ReactCountryFlag countryCode={countryCode} svg title={countryCode} /> : '—'}</span>
        <strong className="flight-client-name">{name}</strong>
      </div>
      {showReservationTime ? (
        <span className="flight-client-detail flight-client-time">
          <small>Hora</small>
          {formatTime(client?.time)}
        </span>
      ) : null}
      {showReservationTime ? <div className="flight-client-rest">{clientRest}</div> : clientRest}
    </div>
  );
}

function FlightStatusIcon({ status }) {
  if (status === 'arrived') return <Check aria-hidden="true" />;
  if (status === 'departed') return <Plane aria-hidden="true" />;
  if (['cancelled', 'canceled', 'diverted', 'delayed', 'error'].includes(status)) return <CircleAlert aria-hidden="true" />;
  return <Clock3 aria-hidden="true" />;
}

export function FlightResult({ result, index, clients = [], singleTime = false, prominentStatus = false, onOpenReservation }) {
  const flightNumber = String(result?.flightNumber ?? '').trim() || '—';
  const hasError = Boolean(result?.error);
  const status = hasError
    ? (ERROR_LABELS[result.error.code] ?? 'Não foi possível consultar este voo')
    : singleTime ? localizeStatus(result?.status) : STATUS_LABELS.scheduled;
  const statusKey = hasError
    ? 'error'
    : singleTime ? String(result?.status ?? 'unknown').toLowerCase() : 'scheduled';
  const flightradarUrl = flightNumber === '—' ? '' : `https://www.flightradar24.com/${encodeURIComponent(flightNumber)}`;
  const airlineBrand = getAirlineBrand(flightNumber);
  const sourceUrl = getSafeSourceUrl(result?.sourceUrl);
  const singleTimeLabel = String(result?.status ?? '').toLowerCase() === 'arrived'
    ? 'Chegou às'
    : 'Previsto';
  const singleTimeValue = result?.arrivalTimeLocal
    ?? result?.actualArrivalLocal
    ?? result?.estimatedArrivalLocal
    ?? result?.scheduledArrivalLocal;

  return (
    <article className={`flight-row flight-row--status-${statusKey} ${hasError ? 'flight-row--error' : ''} ${singleTime ? 'flight-row--single-time' : ''}`} style={{ '--flight-index': index }} aria-label={`Voo ${flightNumber}`}>
      <div className="flight-identity">
        <span className="flight-route-mark" aria-hidden="true"><PlaneLanding /></span>
        <div className="flight-number-line">
          {flightradarUrl ? (
            <a
              className="flight-number-link"
              href={flightradarUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir voo ${flightNumber} no Flightradar24 numa nova aba`}
              title="Abrir voo no Flightradar24"
            >
              <strong>{flightNumber}</strong>
            </a>
          ) : <strong>{flightNumber}</strong>}
          {airlineBrand ? (
            <img className="flight-airline-logo" src={airlineBrand.logoUrl} alt={airlineBrand.name} />
          ) : null}
        </div>
        <span>FNC</span>
      </div>

      {hasError ? (
        <p className="flight-inline-error">
          <CircleAlert aria-hidden="true" />
          {status}
        </p>
      ) : (
        <dl className={`flight-times ${singleTime ? 'flight-times--single' : ''}`}>
          {singleTime
            ? <FlightTime label={singleTimeLabel} value={singleTimeValue} />
            : <FlightTime label="Programado" value={result.scheduledArrivalLocal} />}
        </dl>
      )}

      <div
        className={`flight-status flight-status--${statusKey} ${prominentStatus ? 'flight-status--prominent' : ''}`}
        aria-label={prominentStatus ? `Estado: ${status}` : undefined}
      >
        <span>Estado</span>
        <strong>
          {prominentStatus ? <FlightStatusIcon status={statusKey} /> : null}
          {status}
        </strong>
      </div>

      {!hasError && sourceUrl ? (
        <a className="flight-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${flightNumber} no FlightView`}>
          <ExternalLink aria-hidden="true" />
        </a>
      ) : null}

      {clients.length > 0 ? (
        <div className={`flight-clients ${singleTime ? '' : 'flight-clients--time-aligned'}`} aria-label={`Clientes do voo ${flightNumber}`}>
          <span className="flight-clients-label">Clientes</span>
          {clients.map((client, clientIndex) => (
            <FlightClient
              client={client}
              onOpenReservation={onOpenReservation}
              showReservationTime={!singleTime}
              key={client?.itemId ?? client?.id ?? clientIndex}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

const FUTURE_CACHE_CHECK_MS = 5 * 60 * 1000;

function FlightsWorkspace({ selectedDate, allServiceItems = [], serviceDataLoading = false, serviceDataReady = true, onRetryServiceData, onWorkspaceChange, onOpenReservation, userUid = '' }) {
  const flightNumbers = useMemo(() => getPickupFlightNumbers(allServiceItems), [allServiceItems]);
  const clientsByFlight = useMemo(() => {
    const groupedClients = new Map();

    allServiceItems.forEach((item) => {
      if (item?.serviceType !== 'pickup') return;
      const flightNumber = normalizeFlightNumber(item?.flightNumber);
      if (!flightNumber) return;
      groupedClients.set(flightNumber, [...(groupedClients.get(flightNumber) ?? []), item]);
    });

    return groupedClients;
  }, [allServiceItems]);
  const flightListKey = flightNumbers.join('|');
  const initialCache = getFutureFlightMemoryCache(selectedDate);
  const initialCacheMatches = Boolean(initialCache && doesFutureFlightCacheMatch(initialCache, flightNumbers));
  const cacheRef = useRef(initialCache);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const initialScope = initialCache ? `${selectedDate}:${flightListKey}` : '';
  const [cacheScope, setCacheScope] = useState(initialScope);
  const [state, setState] = useState({
    flightListKey: initialCacheMatches ? flightListKey : '',
    results: initialCacheMatches ? initialCache.results : [],
    refreshing: false,
    error: '',
  });

  useEffect(() => {
    if (!serviceDataReady || !selectedDate) return undefined;
    const scope = `${selectedDate}:${flightListKey}`;
    const memoryCache = getFutureFlightMemoryCache(selectedDate);
    cacheRef.current = memoryCache;
    if (memoryCache && doesFutureFlightCacheMatch(memoryCache, flightNumbers)) {
      setState({ flightListKey, results: memoryCache.results, refreshing: false, error: '' });
    }
    const unsubscribe = subscribeToFutureFlightDay(
      selectedDate,
      (cache) => {
        cacheRef.current = cache;
        if (doesFutureFlightCacheMatch(cache, flightNumbers)) {
          setState({ flightListKey, results: cache.results, refreshing: false, error: '' });
        } else {
          setState({ flightListKey: '', results: [], refreshing: false, error: '' });
        }
        setCacheScope(scope);
      },
      () => {
        cacheRef.current = null;
        setState((current) => ({ ...current, refreshing: false }));
        setCacheScope(scope);
      },
      (error) => {
        console.warn('Shared future flight cache could not be read. Continuing with local data.', error);
        setCacheScope(scope);
      },
    );
    return () => {
      requestIdRef.current += 1;
      inFlightRef.current = false;
      unsubscribe();
    };
  }, [flightListKey, flightNumbers, selectedDate, serviceDataReady]);

  const cacheReady = cacheScope === `${selectedDate}:${flightListKey}`;

  const refreshFlights = useCallback(async ({ force = false } = {}) => {
    if (!serviceDataReady || !flightListKey || inFlightRef.current) return false;
    if (!force) {
      if (isFutureFlightCacheFresh(cacheRef.current, flightNumbers, new Date())) return false;
      setState((current) => ({ ...current, refreshing: true, error: '' }));
      const cacheVersion = String(toTimestampMs(cacheRef.current?.cachedAt, 0) || 'missing');
      const lease = await tryAcquireFutureFlightRefreshLease({ date: selectedDate, userUid, cacheVersion });
      if (!lease.acquired) return false;
    }

    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setState((current) => ({ ...current, refreshing: true, error: '' }));
    try {
      const payload = await fetchFlightArrivals({ arrivalDate: selectedDate, flightNumbers });
      if (requestId !== requestIdRef.current) return false;
      const results = payload?.results ?? [];
      cacheRef.current = { date: selectedDate, cachedAt: new Date(), flightNumbers, results };
      setState({ flightListKey, results, refreshing: false, error: '' });
      try {
        await saveFutureFlightCache({ date: selectedDate, flightNumbers, results, userUid });
      } catch (error) {
        console.warn('Future flights updated, but the shared cache could not be saved.', error);
      }
      return true;
    } catch {
      if (requestId !== requestIdRef.current) return false;
      setState((current) => ({
        ...current,
        refreshing: false,
        error: 'Não foi possível carregar as chegadas. Verifica a ligação e tenta novamente.',
      }));
      return false;
    } finally {
      if (requestId === requestIdRef.current) inFlightRef.current = false;
    }
  }, [flightListKey, flightNumbers, selectedDate, serviceDataReady, userUid]);

  useEffect(() => {
    if (!cacheReady || !serviceDataReady || !flightListKey) return undefined;
    void refreshFlights();
    const timer = window.setInterval(() => void refreshFlights(), FUTURE_CACHE_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [cacheReady, flightListKey, refreshFlights, serviceDataReady]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    inFlightRef.current = false;
  }, []);

  const visibleResults = useMemo(() => state.flightListKey === flightListKey ? state.results : [], [flightListKey, state.flightListKey, state.results]);
  const sortedResults = useMemo(() => sortFutureFlightsByScheduledArrival(visibleResults), [visibleResults]);

  const isLoading = serviceDataReady && Boolean(flightListKey) && (!cacheReady || (visibleResults.length === 0 && state.refreshing));
  const isPreparingDay = serviceDataLoading && !serviceDataReady;
  const isServiceDataUnavailable = !serviceDataLoading && !serviceDataReady;

  const retryServiceData = () => {
    Promise.resolve(onRetryServiceData?.()).catch(() => {});
  };

  return (
    <main className="flights-workspace" aria-busy={isLoading || isPreparingDay}>
      <header className="flights-board-header">
        <div>
          <span className="flights-kicker">Voos · FNC</span>
          <h1>Chegadas</h1>
        </div>
        <div className="flights-header-controls">
          <span className="flights-total">{serviceDataReady ? `${flightNumbers.length} ${flightNumbers.length === 1 ? 'voo' : 'voos'}` : '— voos'}</span>
          <time dateTime={selectedDate}>{selectedDate}</time>
          {state.refreshing && visibleResults.length > 0 ? <span className="flights-refresh-note">A atualizar…</span> : null}
          <button
            type="button"
            className={`ghost-btn compact-btn flights-refresh-btn ${state.refreshing ? 'is-refreshing' : ''}`}
            onClick={() => void refreshFlights({ force: true })}
            disabled={!serviceDataReady || !flightListKey || state.refreshing}
            aria-label="Atualizar voos futuros"
            title="Atualizar voos futuros"
          >
            <RefreshCw aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ghost-btn compact-btn flights-back-btn"
            onClick={() => onWorkspaceChange?.('services')}
            aria-label="Voltar à lista de serviços"
          >
            <ArrowLeft aria-hidden="true" />
            <span>Lista</span>
          </button>
        </div>
      </header>

      {isPreparingDay ? (
        <FlightsWorkspaceSkeleton label="A preparar voos" />
      ) : isServiceDataUnavailable ? (
        <div className="flights-request-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>Não foi possível obter os serviços deste dia.</p>
          <button type="button" className="primary-btn compact-btn" onClick={retryServiceData}>
            Tentar novamente
          </button>
        </div>
      ) : !flightListKey ? (
        <div className="flights-empty">
          <PlaneLanding aria-hidden="true" />
          <p>Não há voos de recolha para este dia.</p>
        </div>
      ) : isLoading ? (
        <FlightsWorkspaceSkeleton label="A carregar voos" />
      ) : state.error && visibleResults.length === 0 ? (
        <div className="flights-request-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>{state.error}</p>
          <button type="button" className="primary-btn compact-btn" onClick={() => void refreshFlights({ force: true })}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {state.error ? <p className="flights-inline-refresh-error" role="alert">{state.error}</p> : null}
          <section className="flights-board" aria-label="Lista de chegadas">
            <div className="flights-board-rule" aria-hidden="true">
              <span>ARR</span>
              <span>RWY 05</span>
            </div>
            <div className="flights-list">
              {sortedResults.map((result, index) => {
                const clients = clientsByFlight.get(normalizeFlightNumber(result?.flightNumber)) ?? [];
                return <FlightResult key={`${result.flightNumber}-${index}`} result={result} index={index} clients={clients} onOpenReservation={onOpenReservation} />;
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default FlightsWorkspace;
