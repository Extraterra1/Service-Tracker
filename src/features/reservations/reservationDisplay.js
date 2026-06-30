export const RESERVATION_STATUS_LABELS = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  collected: 'Recolhida',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-PT')
    .replace(/(^|[\s/-])\p{L}/gu, (match) => match.toLocaleUpperCase('pt-PT'))
}

export function formatReservationDateTime(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?$/)
  if (!match) return text
  const [, year, month, day, hour, minute] = match
  return `${day}/${month}/${year} ${hour}:${minute}`
}

export function formatReservationField(key, value) {
  if (key === 'status') {
    return RESERVATION_STATUS_LABELS[value] ?? toTitleCase(value)
  }

  if (key === 'vehicleGroup' || key === 'pickupStation' || key === 'returnStation') {
    return toTitleCase(value)
  }

  if (key === 'pickupAt' || key === 'returnAt') {
    return formatReservationDateTime(value)
  }

  return value
}
