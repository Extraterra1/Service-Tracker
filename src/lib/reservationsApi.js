import { auth } from './firebaseAuth'

const RESERVATION_API_BASE_URL = 'https://api.justdrivemadeira.com'

async function requestReservationApi(path, params) {
  const user = auth?.currentUser
  if (!user) throw new Error('Inicia sessão para continuar.')

  const token = await user.getIdToken()
  const url = new URL(path, RESERVATION_API_BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) url.searchParams.set(key, value.join(','))
      return
    }
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Não foi possível carregar a reserva.')
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Resposta inválida do serviço de reservas.')
  }
  return payload
}

export function fetchReservations(filters) {
  return requestReservationApi('/api/service-tracker/reservations', filters)
}

export function fetchReservationDetails(reference) {
  return requestReservationApi('/api/service-tracker/reservation-details', { reference })
}
