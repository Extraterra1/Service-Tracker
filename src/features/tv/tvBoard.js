import { normalizeFlightNumber } from '../flights/flightNumbers'

export function getReservationTime(item) {
  return String(item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim() || '--:--'
}

function toSortMinutes(item) {
  const match = getReservationTime(item).match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return Number.POSITIVE_INFINITY
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return Number.POSITIVE_INFINITY
  return hours * 60 + minutes
}

export function selectNextUnfinished(items = [], statusMap = {}) {
  return items
    .map((entry, index) => ({ entry, index, minutes: toSortMinutes(entry) }))
    .filter(({ entry }) => statusMap[entry?.itemId]?.done !== true)
    .sort((a, b) => a.minutes - b.minutes || a.index - b.index)[0]?.entry ?? null
}

function formatFlightTime(value) {
  const match = String(value ?? '').match(/(?:T|\s)(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : ''
}

export function getDeliveryDisplayTime(delivery, flightResults = []) {
  const flightNumber = normalizeFlightNumber(delivery?.flightNumber)
  const flight = flightNumber
    ? flightResults.find((result) => normalizeFlightNumber(result?.flightNumber) === flightNumber)
    : null
  const flightTime = formatFlightTime(flight?.arrivalTimeLocal)
  return flightTime
    ? { time: flightTime, source: 'flight' }
    : { time: getReservationTime(delivery), source: 'reservation' }
}
