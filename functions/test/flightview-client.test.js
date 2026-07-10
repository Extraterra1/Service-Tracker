import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { lookupFlightViewArrival } from '../src/flights/flightview-client.js';

function createFetch(payloads, ok = true) {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return {
      ok,
      status: ok ? 200 : 503,
      json: async () => {
        const payload = payloads.shift();
        if (payload instanceof Error) throw payload;
        return payload;
      },
    };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

const empty = { flights: [], flight: null, emptyResults: true };
const flight = (overrides = {}) => ({
  flights: [],
  flight: {
    arrival: {
      arrivalDateTime: '2026-06-15T10:35:00-00:00',
      airportCode: 'FNC',
      scheduledTime: '10:35, Jun 15',
      estimatedTime: '10:42, Jun 15',
      inGateTime: '10:44, Jun 15',
      onGroundTime: null,
      ...overrides.arrival,
    },
    departure: { airportCode: 'LIS' },
    flightStatus: 'Arrived',
    ...overrides.flight,
  },
  emptyResults: false,
});

const request = {
  flightNumber: 'TP 1702',
  airportCode: 'FNC',
  arrivalDate: '2026-06-15',
};

describe('lookupFlightViewArrival', () => {
  test('queries the previous and requested departure dates with FlightView headers', async () => {
    const fetchImpl = createFetch([empty, flight()]);
    await lookupFlightViewArrival(request, { fetchImpl });

    assert.equal(fetchImpl.calls[0][0], 'https://app-api.flightview.com/api/v2/flight/TP/1702?departureDate=2026-06-14');
    assert.equal(fetchImpl.calls[1][0], 'https://app-api.flightview.com/api/v2/flight/TP/1702?departureDate=2026-06-15');
    assert.equal(fetchImpl.calls[0][1].headers.origin, 'https://www.flightview.com');
    assert.equal(fetchImpl.calls[0][1].headers.referer, 'https://www.flightview.com/flight-tracker/TP/1702?date=2026-06-14');
  });

  test('matches destination and local arrival date and extracts all arrival times', async () => {
    const result = await lookupFlightViewArrival(request, { fetchImpl: createFetch([empty, flight()]) });
    assert.deepEqual(result, {
      kind: 'success', status: 'arrived', scheduledArrivalLocal: '10:35',
      estimatedArrivalLocal: '10:42', actualArrivalLocal: '10:44',
      sourceUrl: 'https://www.flightview.com/flight-tracker/TP/1702?date=2026-06-15',
    });
  });

  test('matches scheduled date when future flights omit arrivalDateTime', async () => {
    const future = flight({ arrival: { arrivalDateTime: null, scheduledTime: '18:05, Jul 01', estimatedTime: null, inGateTime: null }, flight: { flightStatus: 'Scheduled' } });
    const result = await lookupFlightViewArrival({ ...request, arrivalDate: '2026-07-01' }, { fetchImpl: createFetch([empty, future]) });
    assert.equal(result.kind, 'success');
    assert.equal(result.scheduledArrivalLocal, '18:05');
  });

  test('builds a source URL for the matching departure airport detail', async () => {
    const summary = { flights: [{ departureAirportCode: 'LIS' }], flight: null };
    const result = await lookupFlightViewArrival(request, { fetchImpl: createFetch([empty, summary, flight()]) });
    assert.equal(result.sourceUrl, 'https://www.flightview.com/flight-tracker/TP/1702?date=2026-06-15&depapt=LIS');
  });

  test('returns flightview_unavailable for non-OK responses', async () => {
    assert.deepEqual(await lookupFlightViewArrival(request, { fetchImpl: createFetch([], false) }), {
      kind: 'error', code: 'flightview_unavailable', message: 'FlightView lookup failed for TP1702',
    });
  });

  test('returns parse_failed for malformed payloads', async () => {
    assert.deepEqual(await lookupFlightViewArrival(request, { fetchImpl: createFetch([null]) }), {
      kind: 'error', code: 'parse_failed', message: 'Unable to parse FlightView data for TP1702',
    });
  });

  test('returns not_found when no candidate matches airport and date', async () => {
    const result = await lookupFlightViewArrival({ ...request, airportCode: 'OPO' }, { fetchImpl: createFetch([empty, flight()]) });
    assert.deepEqual(result, {
      kind: 'error', code: 'not_found',
      message: 'No FlightView match found for TP 1702 arriving at OPO on 2026-06-15',
    });
  });

  test('returns ambiguous_match when multiple candidates match', async () => {
    const summary = { flights: [{ departureAirportCode: 'LIS' }, { departureAirportCode: 'OPO' }], flight: null };
    const result = await lookupFlightViewArrival(request, { fetchImpl: createFetch([empty, summary, flight(), flight({ flight: { departure: { airportCode: 'OPO' } } })]) });
    assert.deepEqual(result, {
      kind: 'error', code: 'ambiguous_match',
      message: 'Multiple FlightView matches found for TP 1702 arriving at FNC on 2026-06-15',
    });
  });
});
