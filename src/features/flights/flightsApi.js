const MAX_BATCH_SIZE = 20
const DEFAULT_FLIGHTS_API_URL = 'https://fncfutures.vercel.app/arrivals'

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
  const resolved = results.filter((result) => result && !result.error).length

  return {
    requested,
    resolved,
    failed: requested - resolved,
  }
}

function getFlightsApiUrl() {
  return String(import.meta.env.VITE_FLIGHTS_API_URL ?? DEFAULT_FLIGHTS_API_URL).trim() || DEFAULT_FLIGHTS_API_URL
}

async function fetchBatch({ arrivalDate, flightNumbers }) {
  const response = await fetch(getFlightsApiUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      airportCode: 'FNC',
      arrivalDate,
      flightNumbers,
    }),
  })

  if (!response.ok) {
    throw new Error(`Aviability API error (${response.status})`)
  }

  return response.json()
}

export async function fetchFlightArrivals({ arrivalDate, flightNumbers }) {
  if (flightNumbers.length === 0) return createEmptyResponse(arrivalDate)

  const results = []

  for (let index = 0; index < flightNumbers.length; index += MAX_BATCH_SIZE) {
    const batch = flightNumbers.slice(index, index + MAX_BATCH_SIZE)
    const payload = await fetchBatch({ arrivalDate, flightNumbers: batch })
    results.push(...(Array.isArray(payload?.results) ? payload.results : []))
  }

  return {
    source: 'flightview',
    airportCode: 'FNC',
    arrivalDate,
    summary: summarize(results, flightNumbers.length),
    results,
  }
}
