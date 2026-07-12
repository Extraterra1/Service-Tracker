import { addDays } from './date'

export function getFutureFlightsStartDate(serviceDate) {
  return addDays(serviceDate, 1)
}

export function resolveWorkspace(hash, canManageAccess) {
  if (hash === '#porta-chaves') {
    return 'keyrings'
  }

  if (hash === '#voos' && canManageAccess) {
    return 'flights'
  }

  return hash === '#reservas' && canManageAccess ? 'reservations' : 'services'
}
