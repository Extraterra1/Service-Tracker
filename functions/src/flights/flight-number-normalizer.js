import { readFileSync } from 'node:fs';

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

function parseFlightNumber(flightNumber) {
  const normalized = normalizeCode(flightNumber);
  const match = normalized.match(/^([A-Z]{2,3})([A-Z0-9]+)$/);

  if (!match) return undefined;

  return { prefix: match[1], suffix: match[2] };
}

export function buildIcaoToIataMap(mappings) {
  const map = new Map();

  for (const mapping of mappings) {
    const iata = normalizeCode(mapping.iata);
    const icao = normalizeCode(mapping.icao);
    if (iata && icao) map.set(icao, iata);
  }

  return map;
}

export function loadIcaoToIataMap(
  fileUrl = new URL('./airline-codes.json', import.meta.url),
) {
  const mappings = JSON.parse(readFileSync(fileUrl, 'utf8'));
  return buildIcaoToIataMap(mappings);
}

export function normalizeFlightNumberForLookup(flightNumber, icaoToIataMap) {
  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) return normalizeCode(flightNumber);

  const prefix = icaoToIataMap.get(parsed.prefix) ?? parsed.prefix;
  return `${prefix}${parsed.suffix}`;
}
