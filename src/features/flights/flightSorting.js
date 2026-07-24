const ARRIVAL_TIME_FIELDS = [
  'arrivalTimeLocal',
  'actualArrivalLocal',
  'estimatedArrivalLocal',
  'scheduledArrivalLocal',
]

export function getEffectiveArrivalTime(flight) {
  for (const field of ARRIVAL_TIME_FIELDS) {
    const timestamp = Date.parse(String(flight?.[field] ?? ''))
    if (Number.isFinite(timestamp)) return timestamp
  }
  return Number.POSITIVE_INFINITY
}

function getFlightNumber(flight) {
  return String(flight?.flightNumber ?? '').replace(/\s+/g, '').toUpperCase()
}

export function sortFlightsByArrivalTime(flights = []) {
  return [...flights].sort((left, right) => {
    const timeDifference = getEffectiveArrivalTime(left) - getEffectiveArrivalTime(right)
    if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference
    return getFlightNumber(left).localeCompare(getFlightNumber(right))
  })
}

export function sortFutureFlightsByScheduledArrival(flights = []) {
  return [...flights].sort((left, right) => {
    const leftTime = Date.parse(String(left?.scheduledArrivalLocal ?? ''))
    const rightTime = Date.parse(String(right?.scheduledArrivalLocal ?? ''))
    const normalizedLeftTime = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY
    const normalizedRightTime = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY
    const timeDifference = normalizedLeftTime - normalizedRightTime
    if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference
    return getFlightNumber(left).localeCompare(getFlightNumber(right))
  })
}
