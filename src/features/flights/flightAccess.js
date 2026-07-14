function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function canViewLiveFlights({
  canManageAccess = false,
  userEmail = '',
  devEmail = '',
  isDev = false,
} = {}) {
  if (canManageAccess) return true
  const normalizedDevEmail = normalizeEmail(devEmail)
  return Boolean(isDev && normalizedDevEmail && normalizeEmail(userEmail) === normalizedDevEmail)
}
