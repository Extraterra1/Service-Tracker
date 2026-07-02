import { HttpsError } from 'firebase-functions/v2/https'

const ALLOWED_STATUSES = new Set(['confirmed', 'cancelled', 'pending', 'collected', 'completed'])
const ALLOWED_PAGE_SIZES = new Set([10, 25, 50, 100, 200])
const ALLOWED_KEYS = new Set(['page', 'pageSize', 'q', 'status'])

function invalidFilters() {
  return new HttpsError('invalid-argument', 'Filtros de reservas inválidos.')
}

function normalizeFilters(data) {
  if (data == null) data = {}
  if (typeof data !== 'object' || Array.isArray(data)) throw invalidFilters()
  if (Object.keys(data).some((key) => !ALLOWED_KEYS.has(key))) throw invalidFilters()

  const page = data.page ?? 1
  const pageSize = data.pageSize ?? 50
  const q = data.q == null ? '' : String(data.q).trim()
  const rawStatuses = data.status ?? []

  if (!Number.isInteger(page) || page < 1) throw invalidFilters()
  if (!Number.isInteger(pageSize) || !ALLOWED_PAGE_SIZES.has(pageSize)) throw invalidFilters()
  if (q.length > 200) throw invalidFilters()
  if (!Array.isArray(rawStatuses)) throw invalidFilters()

  const status = [...new Set(rawStatuses)]
  if (status.length > ALLOWED_STATUSES.size || status.some((value) => !ALLOWED_STATUSES.has(value))) {
    throw invalidFilters()
  }

  return { page, pageSize, q, status }
}

function upstreamError(status) {
  if (status === 400) return new HttpsError('invalid-argument', 'Filtros de reservas inválidos.')
  if (status === 429) return new HttpsError('resource-exhausted', 'Demasiados pedidos. Tenta novamente.')
  if (status === 502 || status === 503 || status === 504) {
    return new HttpsError('unavailable', 'O serviço de reservas está indisponível.')
  }
  return new HttpsError('internal', 'Não foi possível carregar as reservas.')
}

export function createReservationsHandler({ db, getServiceKey, apiBaseUrl, fetchImpl = fetch }) {
  return async function getReservations(request) {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Inicia sessão para continuar.')

    const profileSnapshot = await db.doc(`staff_allowlist/${uid}`).get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    if (profile?.active !== true || profile?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Apenas administradores podem consultar reservas.')
    }

    const filters = normalizeFilters(request.data)
    const url = new URL('/api/internal/reservations', apiBaseUrl)
    url.searchParams.set('page', String(filters.page))
    url.searchParams.set('pageSize', String(filters.pageSize))
    if (filters.q) url.searchParams.set('q', filters.q)
    if (filters.status.length) url.searchParams.set('status', filters.status.join(','))

    let response
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-JD-Service-Tracker-Key': getServiceKey(),
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new HttpsError('unavailable', 'O serviço de reservas está indisponível.')
    }

    if (!response.ok) throw upstreamError(response.status)
    try {
      const payload = await response.json()
      if (!payload || typeof payload !== 'object' || !Array.isArray(payload.reservations)) {
        throw new Error('Invalid response')
      }
      return payload
    } catch {
      throw new HttpsError('internal', 'Resposta inválida do serviço de reservas.')
    }
  }
}

function normalizeReference(value) {
  return String(value ?? '').trim().replace(/^0+(?=\d)/, '')
}

export function createReservationDetailsHandler({ db, getServiceKey, apiBaseUrl, fetchImpl = fetch }) {
  return async function getReservationDetails(request) {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Inicia sessão para continuar.')

    const profileSnapshot = await db.doc(`staff_allowlist/${uid}`).get()
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null
    if (profile?.active !== true) {
      throw new HttpsError('permission-denied', 'Acesso de equipa ativo necessário.')
    }

    const data = request.data
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some((key) => key !== 'reference')) {
      throw invalidFilters()
    }
    const reference = String(data.reference ?? '').trim()
    if (!/^\d{1,20}$/.test(reference)) throw invalidFilters()

    const url = new URL('/api/internal/reservations', apiBaseUrl)
    url.searchParams.set('page', '1')
    url.searchParams.set('pageSize', '10')
    url.searchParams.set('q', reference)

    let response
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-JD-Service-Tracker-Key': getServiceKey(),
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new HttpsError('unavailable', 'O serviço de reservas está indisponível.')
    }

    if (!response.ok) throw upstreamError(response.status)
    let payload
    try {
      payload = await response.json()
    } catch {
      throw new HttpsError('internal', 'Resposta inválida do serviço de reservas.')
    }
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.reservations)) {
      throw new HttpsError('internal', 'Resposta inválida do serviço de reservas.')
    }

    const normalizedReference = normalizeReference(reference)
    const reservation = payload.reservations.find(
      (entry) => normalizeReference(entry?.reference) === normalizedReference,
    )
    if (!reservation) throw new HttpsError('not-found', 'Reserva não encontrada.')
    return reservation
  }
}
