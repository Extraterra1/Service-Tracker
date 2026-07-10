export function resolveWorkspace(hash, canManageAccess) {
  if (hash === '#voos' && canManageAccess) {
    return 'flights'
  }

  return hash === '#reservas' && canManageAccess ? 'reservations' : 'services'
}
