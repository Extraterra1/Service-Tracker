import { getFunctions, httpsCallable } from 'firebase/functions'

import { app } from '../../lib/firebase'

const MAX_BATCH_SIZE = 20

function createEmptyResponse(arrivalDate) {
  return {
    source: 'flightview',
    airportCode: 'FNC',
    arrivalDate,
    summary: { requested: 0, resolved: 0, failed: 0 },
    results: [],
  }
}

function summarize(results, requested) {
  const resolved = results.filter(
    (result) =>
      result &&
      !result.error &&
      (Object.hasOwn(result, 'status') || result.success === true),
  ).length

  return {
    requested,
    resolved,
    failed: requested - resolved,
  }
}

export async function fetchFlightArrivals({ arrivalDate, flightNumbers }) {
  if (flightNumbers.length === 0) return createEmptyResponse(arrivalDate)
  if (!app) throw new Error('Firebase não está configurado.')

  const functions = getFunctions(app, 'europe-west9')
  const lookup = httpsCallable(functions, 'getFlightArrivals')
  const results = []

  for (let index = 0; index < flightNumbers.length; index += MAX_BATCH_SIZE) {
    const batch = flightNumbers.slice(index, index + MAX_BATCH_SIZE)
    const response = await lookup({ arrivalDate, flightNumbers: batch })
    results.push(...(response.data?.results ?? []))
  }

  return {
    source: 'flightview',
    airportCode: 'FNC',
    arrivalDate,
    summary: summarize(results, flightNumbers.length),
    results,
  }
}
