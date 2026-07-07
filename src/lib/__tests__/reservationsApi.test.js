import { beforeEach, describe, expect, it, vi } from 'vitest'

const getIdToken = vi.fn()
vi.mock('../firebaseAuth', () => ({
  auth: { currentUser: { getIdToken } },
}))

describe('reservationsApi', () => {
  beforeEach(() => {
    vi.resetModules()
    getIdToken.mockReset()
    getIdToken.mockResolvedValue('firebase-id-token')
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetches reservation pages directly from cPanel with the Firebase ID token', async () => {
    const payload = { reservations: [], page: 2, totalPages: 3, totalRows: 30, statusCounts: {} }
    fetch.mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const { fetchReservations } = await import('../reservationsApi')

    await expect(fetchReservations({ page: 2, pageSize: 10, pickupFrom: '2026-07-01', pickupTo: '2026-07-01', q: 'ABC', status: ['confirmed', 'cancelled'] })).resolves.toEqual(payload)
    const [url, options] = fetch.mock.calls[0]
    const parsedUrl = new URL(url)
    expect(parsedUrl.origin).toBe('https://api.justdrivemadeira.com')
    expect(parsedUrl.pathname).toBe('/api/service-tracker/reservations')
    expect(parsedUrl.searchParams.get('pickupFrom')).toBe('2026-07-01')
    expect(parsedUrl.searchParams.get('pickupTo')).toBe('2026-07-01')
    expect(parsedUrl.searchParams.get('status')).toBe('confirmed,cancelled')
    expect(options.headers.Authorization).toBe('Bearer firebase-id-token')
    expect(options.credentials).toBe('omit')
  })

  it('fetches reservation details from the staff-authorized cPanel route', async () => {
    const reservation = { reference: '000123', customer: 'Maria' }
    fetch.mockResolvedValue(new Response(JSON.stringify(reservation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const { fetchReservationDetails } = await import('../reservationsApi')

    await expect(fetchReservationDetails('000123')).resolves.toEqual(reservation)
    const [url] = fetch.mock.calls[0]
    expect(new URL(url).pathname).toBe('/api/service-tracker/reservation-details')
    expect(new URL(url).searchParams.get('reference')).toBe('000123')
  })

  it('requires a signed-in Firebase user and surfaces sanitized API errors', async () => {
    const { auth } = await import('../firebaseAuth')
    auth.currentUser = null
    const { fetchReservations } = await import('../reservationsApi')
    await expect(fetchReservations({})).rejects.toThrow('Inicia sessão para continuar.')

    auth.currentUser = { getIdToken }
    fetch.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Access denied' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }))
    await expect(fetchReservations({})).rejects.toThrow('Access denied')
  })
})
