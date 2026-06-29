export function resolveWorkspace(hash, canManageAccess) {
  return hash === '#reservas' && canManageAccess ? 'reservations' : 'services'
}
