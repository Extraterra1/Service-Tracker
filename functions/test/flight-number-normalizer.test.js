import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildIcaoToIataMap,
  normalizeFlightNumberForLookup,
} from '../src/flights/flight-number-normalizer.js';

describe('normalizeFlightNumberForLookup', () => {
  const codeMap = buildIcaoToIataMap([
    { airline: 'easyJet Europe', iata: 'U2', icao: 'EJU' },
    { airline: 'Ryanair', iata: 'FR', icao: 'RYR' },
  ]);

  test('converts ICAO prefixes to IATA prefixes for lookup', () => {
    assert.equal(normalizeFlightNumberForLookup('EJU7631', codeMap), 'U27631');
    assert.equal(normalizeFlightNumberForLookup('RYR366', codeMap), 'FR366');
  });

  test('keeps already-normalized IATA flight numbers unchanged', () => {
    assert.equal(normalizeFlightNumberForLookup('U27631', codeMap), 'U27631');
    assert.equal(normalizeFlightNumberForLookup('FR366', codeMap), 'FR366');
  });

  test('keeps unknown airline prefixes unchanged', () => {
    assert.equal(normalizeFlightNumberForLookup('ZZ1234', codeMap), 'ZZ1234');
  });

  test('removes all whitespace before parsing and normalizing', () => {
    assert.equal(normalizeFlightNumberForLookup('  EJU 7631  ', codeMap), 'U27631');
    assert.equal(normalizeFlightNumberForLookup(' U2\t7631 ', codeMap), 'U27631');
  });
});
