import { addDays } from './date'

export function getFutureFlightsStartDate(serviceDate) {
  return addDays(serviceDate, 1)
}

export function resolveWorkspace(hash, canManageAccess = true) {
  if (hash === '#porta-chaves') {
    return 'keyrings'
  }

  if (hash === '#voos') {
    return 'flights'
  }

  if (hash === '#voos-futuros' && canManageAccess) {
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
