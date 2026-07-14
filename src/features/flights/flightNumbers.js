import airlineCodes from './airlineCodes.json'

const IATA_BY_ICAO = new Map(
  airlineCodes.map(({ icao, iata }) => [String(icao).toUpperCase(), String(iata).toUpperCase()]),
)

export function normalizeFlightNumber(value) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').toUpperCase()
  const match = normalized.match(/^([A-Z]{3})(.+)$/)
  if (!match) return normalized
  const iata = IATA_BY_ICAO.get(match[1])
  return iata ? `${iata}${match[2]}` : normalized
}

export function getPickupFlightNumbers(items = []) {
  return [
    ...new Set(
      items
        .filter((item) => item?.serviceType === 'pickup')
        .map((item) => normalizeFlightNumber(item?.flightNumber))
        .filter(Boolean),
    ),
  ]
}
