import { normalizeFlightNumber } from './flightNumbers'

const DEFAULT_FR24_API_BASE_URL = 'https://fr-24-scraper.vercel.app'
const DEFAULT_AIRPORT = 'FNC'
const MAX_BATCH_SIZE = 25
const MADEIRA_TIME_ZONE = 'Atlantic/Madeira'

function createApiError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function getConfig() {
  return {
    baseUrl: String(import.meta.env.VITE_FR24_API_BASE_URL ?? DEFAULT_FR24_API_BASE_URL).trim().replace(/\/+$/, ''),
    apiKey: String(import.meta.env.VITE_FR24_API_KEY ?? '').trim(),
    airport: String(import.meta.env.VITE_FR24_AIRPORT ?? DEFAULT_AIRPORT).trim().toUpperCase() || DEFAULT_AIRPORT,
  }
}

function formatMadeiraLocal(utcValue) {
  if (!utcValue) return null
  const date = new Date(utcValue)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADEIRA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

function mapStatus(value) {
  const status = String(value ?? '').trim().toLowerCase()
  if (status === 'landed') return 'arrived'
  return status || 'unknown'
}

function mapResult(item, requestedFlightNumber) {
  const flightNumber = normalizeFlightNumber(item?.flightNumber) || requestedFlightNumber
  if (item?.lookupState === 'not_found') {
    return { flightNumber, error: { code: 'not_found' } }
  }
  if (item?.lookupState !== 'ok') {
    return { flightNumber, error: { code: 'flight_checker_unavailable' } }
  }

  const status = mapStatus(item.status)
  const selectedUtc = item?.arrivalTime?.selectedUtc ?? null
  const estimatedUtc = item?.arrivalTime?.estimatedUtc ?? null
  const scheduledUtc = item?.arrivalTime?.scheduledUtc ?? null
  return {
    flightNumber,
    status,
    rawStatus: String(item?.rawStatus ?? ''),
    scheduledArrivalLocal: formatMadeiraLocal(scheduledUtc),
    estimatedArrivalLocal: formatMadeiraLocal(estimatedUtc),
    actualArrivalLocal: status === 'arrived' ? formatMadeiraLocal(selectedUtc) : null,
    arrivalTimeLocal: formatMadeiraLocal(selectedUtc),
    arrivalTimestampUtc: selectedUtc,
    airline: String(item?.airline ?? ''),
    origin: item?.origin && typeof item.origin === 'object' ? item.origin : null,
  }
}

async function fetchBatch({ baseUrl, apiKey, airport, date, flightNumbers, signal }) {
  const response = await fetch(`${baseUrl}/api/flights/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ flightNumbers, date, airport }),
    signal,
  })
  if (!response.ok) {
    if (response.status === 401) throw createApiError('unauthorized', 'FR24 API authorization failed.')
    if (response.status === 429) throw createApiError('rate_limited', 'FR24 API rate limit reached.')
    throw createApiError('request_failed', `FR24 API error (${response.status}).`)
  }
  const payload = await response.json()
  const results = Array.isArray(payload?.results) ? payload.results : []
  const byFlight = new Map(results.map((item) => [normalizeFlightNumber(item?.flightNumber), item]))
  return flightNumbers.map((flightNumber) => mapResult(byFlight.get(flightNumber), flightNumber))
}

export async function fetchCurrentFlights({ date, flightNumbers, signal } = {}) {
  const { baseUrl, apiKey, airport } = getConfig()
  if (!apiKey) throw createApiError('missing_api_key', 'Missing VITE_FR24_API_KEY.')
  const normalizedFlights = [...new Set((flightNumbers ?? []).map(normalizeFlightNumber).filter(Boolean))]
  if (normalizedFlights.length === 0) return []
  const batches = []
  for (let index = 0; index < normalizedFlights.length; index += MAX_BATCH_SIZE) {
    batches.push(normalizedFlights.slice(index, index + MAX_BATCH_SIZE))
  }
  const batchResults = await Promise.all(
    batches.map((batch) => fetchBatch({ baseUrl, apiKey, airport, date, flightNumbers: batch, signal })),
  )
  return batchResults.flat()
}
