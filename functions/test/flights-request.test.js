import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createFlightArrivalsHandler, parseFlightArrivalsRequest } from '../src/flights/request.js';

describe('parseFlightArrivalsRequest', () => {
  test('normalizes uppercase whitespace-free flight numbers', () => {
    assert.deepEqual(parseFlightArrivalsRequest({
      arrivalDate: '2026-07-10',
      flightNumbers: [' tp 100 ', 'FR\t200'],
    }), {
      success: true,
      data: { arrivalDate: '2026-07-10', flightNumbers: ['TP100', 'FR200'] },
    });
  });

  test('rejects impossible or non-canonical dates', () => {
    for (const arrivalDate of ['2026-02-30', '2026-2-03', 'not-a-date']) {
      assert.deepEqual(parseFlightArrivalsRequest({ arrivalDate, flightNumbers: ['TP100'] }), { success: false });
    }
  });

  test('requires between 1 and 20 valid normalized flight numbers', () => {
    assert.deepEqual(parseFlightArrivalsRequest({ arrivalDate: '2026-07-10', flightNumbers: [] }), { success: false });
    assert.deepEqual(parseFlightArrivalsRequest({ arrivalDate: '2026-07-10', flightNumbers: Array(21).fill('TP100') }), { success: false });
    assert.deepEqual(parseFlightArrivalsRequest({ arrivalDate: '2026-07-10', flightNumbers: ['   '] }), { success: false });
  });
});

class TestHttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function createHandler(overrides = {}) {
  return createFlightArrivalsHandler({
    HttpsErrorClass: TestHttpsError,
    getStaffAllowlist: async () => ({ exists: true, active: true }),
    getArrivals: async (data) => ({ ok: true, ...data }),
    logError: () => {},
    ...overrides,
  });
}

describe('createFlightArrivalsHandler', () => {
  test('rejects missing authentication', async () => {
    await assert.rejects(() => createHandler()({ data: {}, auth: null }), { code: 'unauthenticated' });
  });

  test('rejects missing or inactive staff allowlist records', async () => {
    for (const record of [{ exists: false }, { exists: true, active: false }]) {
      const handler = createHandler({ getStaffAllowlist: async () => record });
      await assert.rejects(() => handler({ data: {}, auth: { uid: 'staff-1' } }), { code: 'permission-denied' });
    }
  });

  test('rejects invalid request data', async () => {
    const handler = createHandler();
    await assert.rejects(
      () => handler({ data: { arrivalDate: '2026-02-30', flightNumbers: ['TP100'] }, auth: { uid: 'staff-1' } }),
      { code: 'invalid-argument' },
    );
  });

  test('allows active staff and returns the service response', async () => {
    const handler = createHandler();
    const response = await handler({
      data: { arrivalDate: '2026-07-10', flightNumbers: [' tp 100 '] },
      auth: { uid: 'staff-1' },
    });
    assert.deepEqual(response, { ok: true, arrivalDate: '2026-07-10', flightNumbers: ['TP100'] });
  });

  test('logs unexpected upstream failures safely and returns an internal error', async () => {
    const logs = [];
    const handler = createHandler({
      getArrivals: async () => { throw new Error('provider leaked detail'); },
      logError: (message, metadata) => logs.push([message, metadata]),
    });

    await assert.rejects(
      () => handler({ data: { arrivalDate: '2026-07-10', flightNumbers: ['TP100'] }, auth: { uid: 'staff-1' } }),
      { code: 'internal' },
    );
    assert.deepEqual(logs, [['Flight arrivals lookup failed', { errorType: 'Error' }]]);
  });
});
