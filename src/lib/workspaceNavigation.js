export function resolveWorkspace(hash, canManageAccess) {
  if (hash === '#voos') {
    return 'flights'
  }

  return hash === '#reservas' && canManageAccess ? 'reservations' : 'services'
}
