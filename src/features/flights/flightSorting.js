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

function getScheduledArrivalTime(flight) {
  const value = String(flight?.scheduledArrivalLocal ?? '').trim()
  const clockMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (clockMatch) {
    const hours = Number(clockMatch[1])
    const minutes = Number(clockMatch[2])
    const seconds = Number(clockMatch[3] ?? 0)
    if (hours < 24 && minutes < 60 && seconds < 60) return (hours * 60 * 60) + (minutes * 60) + seconds
  }
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY
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
    const timeDifference = getScheduledArrivalTime(left) - getScheduledArrivalTime(right)
    if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference
    return getFlightNumber(left).localeCompare(getFlightNumber(right))
  })
}
