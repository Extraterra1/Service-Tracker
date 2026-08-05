import { normalizeFlightNumber } from '../flights/flightNumbers'

export function getReservationTime(item) {
  return String(item?.overrideTime ?? item?.displayTime ?? item?.time ?? '').trim() || '--:--'
}

function timeToMinutes(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return Number.POSITIVE_INFINITY
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return Number.POSITIVE_INFINITY
  return hours * 60 + minutes
}

function toSortMinutes(item) {
  return timeToMinutes(getReservationTime(item))
}

export function selectNextUnfinishedItems(items = [], statusMap = {}, limit = 1) {
  return items
    .map((entry, index) => ({ entry, index, minutes: toSortMinutes(entry) }))
    .filter(({ entry }) => statusMap[entry?.itemId]?.done !== true)
    .sort((a, b) => a.minutes - b.minutes || a.index - b.index)
    .slice(0, limit)
    .map(({ entry }) => entry)
}

export function selectNextUnfinished(items = [], statusMap = {}) {
  return selectNextUnfinishedItems(items, statusMap, 1)[0] ?? null
}

export function selectNextUnfinishedDeliveries(items = [], statusMap = {}, flightResults = [], limit = 1) {
  return items
    .map((entry, index) => ({
      entry,
      index,
      minutes: timeToMinutes(getDeliveryDisplayTime(entry, flightResults).time),
    }))
    .filter(({ entry }) => statusMap[entry?.itemId]?.done !== true)
    .sort((a, b) => a.minutes - b.minutes || a.index - b.index)
    .slice(0, limit)
    .map(({ entry }) => entry)
}

function formatFlightTime(value) {
  const match = String(value ?? '').match(/(?:T|\s)(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : ''
}

export function getDeliveryDisplayTime(delivery, flightResults = []) {
  const reservationTime = getReservationTime(delivery)
  if (reservationTime === '23:59') {
    return { time: reservationTime, source: 'reservation' }
  }

  const flightNumber = normalizeFlightNumber(delivery?.flightNumber)
  const flight = flightNumber
    ? flightResults.find((result) => normalizeFlightNumber(result?.flightNumber) === flightNumber)
    : null
  const flightTime = formatFlightTime(flight?.arrivalTimeLocal)
  return flightTime
    ? { time: flightTime, source: 'flight' }
    : { time: reservationTime, source: 'reservation' }
}
