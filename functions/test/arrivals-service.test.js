import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createArrivalsService } from '../src/flights/arrivals-service.js';

describe('createArrivalsService', () => {
  test('preserves result order and summarizes partial per-flight errors', async () => {
    const lookupArrival = async ({ flightNumber }) =>
      flightNumber === 'TP100'
        ? {
            kind: 'success',
            status: 'landed',
            scheduledArrivalLocal: '08:00',
            estimatedArrivalLocal: '08:05',
            actualArrivalLocal: '08:03',
            sourceUrl: 'https://example.test/TP100',
          }
        : {
            kind: 'error',
            code: 'not_found',
            message: `No match for ${flightNumber}`,
          };
    const getArrivals = createArrivalsService({ lookupArrival, normalizeFlightNumber: (value) => value });

    const response = await getArrivals({
      arrivalDate: '2026-07-10',
      flightNumbers: ['TP100', 'FR200'],
    });

    assert.deepEqual(response, {
      source: 'flightview',
      airportCode: 'FNC',
      arrivalDate: '2026-07-10',
      summary: { requested: 2, resolved: 1, failed: 1 },
      results: [
        {
          flightNumber: 'TP100',
          status: 'landed',
          scheduledArrivalLocal: '08:00',
          estimatedArrivalLocal: '08:05',
          actualArrivalLocal: '08:03',
          sourceUrl: 'https://example.test/TP100',
        },
        { flightNumber: 'FR200', error: { code: 'not_found', message: 'No match for FR200' } },
      ],
    });
  });

  test('deduplicates equivalent upstream lookup keys while preserving requested codes', async () => {
    const calls = [];
    const getArrivals = createArrivalsService({
      normalizeFlightNumber: (value) => (value === 'EJU7631' ? 'U27631' : value),
      lookupArrival: async (request) => {
        calls.push(request);
        return { kind: 'success', status: 'scheduled', scheduledArrivalLocal: '08:55' };
      },
    });

    const response = await getArrivals({
      arrivalDate: '2026-03-22',
      flightNumbers: ['EJU7631', 'U27631', 'U27631'],
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      flightNumber: 'EJU7631',
      searchFlightNumber: 'U27631',
      airportCode: 'FNC',
      arrivalDate: '2026-03-22',
    });
    assert.deepEqual(response.summary, { requested: 3, resolved: 3, failed: 0 });
    assert.deepEqual(response.results.map((result) => result.flightNumber), ['EJU7631', 'U27631', 'U27631']);
  });

  test('rewrites provider error flight numbers to each requested response code', async () => {
    const getArrivals = createArrivalsService({
      normalizeFlightNumber: () => 'U27631',
      lookupArrival: async () => ({
        kind: 'error',
        code: 'flightview_unavailable',
        message: 'FlightView lookup failed for U27631',
      }),
    });

    const response = await getArrivals({ arrivalDate: '2026-03-22', flightNumbers: ['EJU7631'] });

    assert.deepEqual(response.results, [{
      flightNumber: 'EJU7631',
      error: { code: 'flightview_unavailable', message: 'FlightView lookup failed for EJU7631' },
    }]);
  });
});
