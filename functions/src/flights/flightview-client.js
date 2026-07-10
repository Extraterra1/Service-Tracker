const API_BASE = 'https://app-api.flightview.com/api/v2/flight';
const PAGE_BASE = 'https://www.flightview.com/flight-tracker';
const ORIGIN = 'https://www.flightview.com';

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const normalizeStatus = (value) => normalize(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function parseFlightNumber(value) {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (normalized.length < 3) return undefined;
  return { airlineCode: normalized.slice(0, 2), flightNumber: normalized.slice(2) };
}

function subtractOneDay(date) {
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function buildUrl(base, airlineCode, flightNumber, date, departureAirportCode) {
  const url = new URL(`${base}/${encodeURIComponent(airlineCode)}/${encodeURIComponent(flightNumber)}`);
  url.searchParams.set(base === API_BASE ? 'departureDate' : 'date', date);
  if (departureAirportCode) url.searchParams.set(base === API_BASE ? 'departureAirport' : 'depapt', departureAirportCode);
  return url.href;
}

const extractDate = (value) => value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
function matchesScheduledDate(value, arrivalDate) {
  const match = value?.match(/,\s*([A-Z][a-z]{2})\s+(\d{1,2})\b/);
  if (!match) return false;
  const [year, month, day] = arrivalDate.split('-').map(Number);
  const expectedMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
  return match[1] === expectedMonth && Number(match[2]) === day;
}
const extractTime = (value) => value?.match(/T(\d{2}:\d{2})/)?.[1] ?? value?.match(/\b(\d{1,2}:\d{2})\b/)?.[1];

async function fetchResponse(fetchImpl, airlineCode, flightNumber, departureDate, departureAirportCode) {
  let response;
  try {
    response = await fetchImpl(buildUrl(API_BASE, airlineCode, flightNumber, departureDate, departureAirportCode), {
      headers: {
        accept: 'application/json', origin: ORIGIN,
        referer: `${PAGE_BASE}/${airlineCode}/${flightNumber}?date=${departureDate}`,
      },
    });
  } catch {
    return { kind: 'error', code: 'flightview_unavailable', message: `FlightView lookup failed for ${airlineCode}${flightNumber}` };
  }
  if (!response.ok) return { kind: 'error', code: 'flightview_unavailable', message: `FlightView lookup failed for ${airlineCode}${flightNumber}` };
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid payload');
    return payload;
  } catch {
    return { kind: 'error', code: 'parse_failed', message: `Unable to parse FlightView data for ${airlineCode}${flightNumber}` };
  }
}

async function collectCandidates(fetchImpl, airlineCode, flightNumber, departureDate) {
  const response = await fetchResponse(fetchImpl, airlineCode, flightNumber, departureDate);
  if ('kind' in response) return response;
  const candidates = response.flight ? [{ departureDate, flight: response.flight }] : [];
  for (const summary of response.flights ?? []) {
    const departureAirportCode = summary.departureAirportCode?.trim().toUpperCase();
    if (!departureAirportCode) continue;
    const detail = await fetchResponse(fetchImpl, airlineCode, flightNumber, departureDate, departureAirportCode);
    if ('kind' in detail) return detail;
    if (detail.flight) candidates.push({ departureDate, departureAirportCode, flight: detail.flight });
  }
  return candidates;
}

function deduplicate(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = [candidate.flight.scheduleInstanceKey, candidate.departureDate, candidate.departureAirportCode, candidate.flight.arrival?.airportCode, candidate.flight.arrival?.arrivalDateTime].filter(Boolean).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function lookupFlightViewArrival(request, { fetchImpl = globalThis.fetch } = {}) {
  const parsed = parseFlightNumber(request.searchFlightNumber ?? request.flightNumber);
  const notFound = { kind: 'error', code: 'not_found', message: `No FlightView match found for ${request.flightNumber} arriving at ${request.airportCode} on ${request.arrivalDate}` };
  if (!parsed) return notFound;

  const candidates = [];
  for (const departureDate of [subtractOneDay(request.arrivalDate), request.arrivalDate]) {
    const result = await collectCandidates(fetchImpl, parsed.airlineCode, parsed.flightNumber, departureDate);
    if ('kind' in result) return result;
    candidates.push(...result);
  }
  const matches = deduplicate(candidates).filter(({ flight }) =>
    normalize(flight.arrival?.airportCode) === normalize(request.airportCode) &&
    (extractDate(flight.arrival?.arrivalDateTime) === request.arrivalDate || (!flight.arrival?.arrivalDateTime && matchesScheduledDate(flight.arrival?.scheduledTime, request.arrivalDate))),
  );
  if (!matches.length) return notFound;
  let selected = matches[0];
  if (matches.length > 1) {
    const sameDay = matches.filter(({ departureDate }) => departureDate === request.arrivalDate);
    if (sameDay.length !== 1) return { kind: 'error', code: 'ambiguous_match', message: `Multiple FlightView matches found for ${request.flightNumber} arriving at ${request.airportCode} on ${request.arrivalDate}` };
    [selected] = sameDay;
  }
  const arrival = selected.flight.arrival;
  return {
    kind: 'success', status: normalizeStatus(selected.flight.flightStatus ?? 'unknown'),
    scheduledArrivalLocal: extractTime(arrival?.arrivalDateTime ?? arrival?.scheduledTime),
    estimatedArrivalLocal: extractTime(arrival?.estimatedTime),
    actualArrivalLocal: extractTime(arrival?.inGateTime ?? arrival?.onGroundTime),
    sourceUrl: buildUrl(PAGE_BASE, parsed.airlineCode, parsed.flightNumber, selected.departureDate, selected.departureAirportCode),
  };
}
