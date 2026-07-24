import { addDays } from './date'

export function getFutureFlightsStartDate(serviceDate) {
  return addDays(serviceDate, 1)
}

export function resolveWorkspace(hash) {
  if (hash === '#tv') {
    return 'tv'
  }

  if (hash === '#porta-chaves') {
    return 'keyrings'
  }

  if (hash === '#voos') {
    return 'flights'
  }

  if (hash === '#voos-futuros') {
    return 'futureFlights'
  }

  return hash === '#reservas' ? 'reservations' : 'services'
}

export function getPrimaryTabId(workspace) {
  if (workspace === 'services') return 'map'
  if (workspace === 'flights') return 'flights'
  if (workspace === 'reservations') return 'reservations'
  return ''
}
