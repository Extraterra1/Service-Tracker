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

export function formatReservationField(key, value) {
  if (key === 'status') {
    return RESERVATION_STATUS_LABELS[value] ?? toTitleCase(value)
  }

  if (key === 'vehicleGroup' || key === 'pickupStation' || key === 'returnStation') {
    return toTitleCase(value)
  }

  return value
}
