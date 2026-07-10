export function normalizeFlightNumber(value) {
  return String(value ?? '').trim().replace(/\s+/g, '').toUpperCase()
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
