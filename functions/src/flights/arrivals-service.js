import { loadIcaoToIataMap, normalizeFlightNumberForLookup } from './flight-number-normalizer.js';
import { lookupFlightViewArrival } from './flightview-client.js';

function replaceFlightNumber(message, lookupFlightNumber, responseFlightNumber) {
  return String(message).split(lookupFlightNumber).join(responseFlightNumber);
}

function toResponseItem(flightNumber, lookupFlightNumber, lookupResult) {
  if (lookupResult.kind === 'error') {
    return {
      flightNumber,
      error: {
        code: lookupResult.code,
        message: replaceFlightNumber(lookupResult.message, lookupFlightNumber, flightNumber),
      },
    };
  }

  const item = { flightNumber };
  for (const key of [
    'status',
    'scheduledArrivalLocal',
    'estimatedArrivalLocal',
    'actualArrivalLocal',
    'sourceUrl',
  ]) {
    if (lookupResult[key] !== undefined) item[key] = lookupResult[key];
  }
  return item;
}

export function createArrivalsService({
  lookupArrival = lookupFlightViewArrival,
  normalizeFlightNumber,
} = {}) {
  const codeMap = normalizeFlightNumber ? undefined : loadIcaoToIataMap();
  const normalizeForLookup = normalizeFlightNumber ?? ((value) => normalizeFlightNumberForLookup(value, codeMap));

  return async function getArrivals({ arrivalDate, flightNumbers }) {
    const lookups = new Map();

    const results = await Promise.all(flightNumbers.map(async (flightNumber) => {
      const searchFlightNumber = normalizeForLookup(flightNumber);
      if (!lookups.has(searchFlightNumber)) {
        lookups.set(searchFlightNumber, lookupArrival({
          flightNumber,
          searchFlightNumber,
          airportCode: 'FNC',
          arrivalDate,
        }));
      }

      const lookupResult = await lookups.get(searchFlightNumber);
      return toResponseItem(flightNumber, searchFlightNumber, lookupResult);
    }));
    const resolved = results.filter((result) => !result.error).length;

    return {
      source: 'flightview',
      airportCode: 'FNC',
      arrivalDate,
      summary: {
        requested: flightNumbers.length,
        resolved,
        failed: flightNumbers.length - resolved,
      },
      results,
    };
  };
}

export const getFlightArrivals = createArrivalsService();
