import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

function response(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: vi.fn().mockResolvedValue(data) }
}

async function loadApi() {
  vi.resetModules()
  return import('../currentFlightsApi')
}

describe('fetchCurrentFlights', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts normalized flights to FR24-Scraper with its API key and maps UTC times to Madeira', async () => {
    vi.stubEnv('VITE_FR24_API_BASE_URL', 'https://fr24.example.com/')
    vi.stubEnv('VITE_FR24_API_KEY', 'test-key')
    fetchMock.mockResolvedValue(response({
      results: [{
        flightNumber: 'TP1685',
        lookupState: 'ok',
        status: 'landed',
        rawStatus: 'Landed 14:31',
        arrivalTime: {
          estimatedUtc: '2026-07-13T13:31:00.000Z',
          scheduledUtc: '2026-07-13T13:20:00.000Z',
          selectedUtc: '2026-07-13T13:31:00.000Z',
        },
        airline: 'TAP Air Portugal',
        origin: { iata: 'LIS', city: 'Lisbon' },
      }],
    }))
    const { fetchCurrentFlights } = await loadApi()

    await expect(fetchCurrentFlights({ date: '2026-07-13', flightNumbers: [' TP 1685 '] })).resolves.toEqual([{
      flightNumber: 'TP1685',
      status: 'arrived',
      rawStatus: 'Landed 14:31',
      scheduledArrivalLocal: '2026-07-13T14:20',
      estimatedArrivalLocal: '2026-07-13T14:31',
      actualArrivalLocal: '2026-07-13T14:31',
      arrivalTimeLocal: '2026-07-13T14:31',
      arrivalTimestampUtc: '2026-07-13T13:31:00.000Z',
      airline: 'TAP Air Portugal',
      origin: { iata: 'LIS', city: 'Lisbon' },
    }])
    expect(fetchMock).toHaveBeenCalledWith('https://fr24.example.com/api/flights/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'test-key' },
      body: JSON.stringify({ flightNumbers: ['TP1685'], date: '2026-07-13', airport: 'FNC' }),
      signal: undefined,
    })
  })

  it('uses the deployed FR24 endpoint and requests chunks of 25 concurrently', async () => {
    vi.stubEnv('VITE_FR24_API_KEY', 'test-key')
    const flights = Array.from({ length: 26 }, (_, index) => `TP${100 + index}`)
    const resolvers = []
    fetchMock.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)))
    const { fetchCurrentFlights } = await loadApi()

    const request = fetchCurrentFlights({ date: '2026-07-13', flightNumbers: flights })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('https://fr-24-scraper.vercel.app/api/flights/status')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).flightNumbers).toHaveLength(25)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).flightNumbers).toEqual(['TP125'])

    resolvers[0](response({ results: flights.slice(0, 25).map((flightNumber) => ({ flightNumber, lookupState: 'not_found' })) }))
    resolvers[1](response({ results: [{ flightNumber: 'TP125', lookupState: 'not_found' }] }))
    await expect(request).resolves.toHaveLength(26)
  })

  it('sends canonical IATA numbers when pickup data contains ICAO prefixes', async () => {
    vi.stubEnv('VITE_FR24_API_KEY', 'test-key')
    fetchMock.mockResolvedValue(response({ results: [{ flightNumber: 'U21234', lookupState: 'not_found' }] }))
    const { fetchCurrentFlights } = await loadApi()

    await expect(fetchCurrentFlights({ date: '2026-07-14', flightNumbers: ['EZS 1234'] })).resolves.toEqual([
      { flightNumber: 'U21234', error: { code: 'not_found' } },
    ])
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).flightNumbers).toEqual(['U21234'])
  })

  it('maps partial not-found and source-error results without rejecting successful siblings', async () => {
    vi.stubEnv('VITE_FR24_API_KEY', 'test-key')
    fetchMock.mockResolvedValue(response({ results: [
      { flightNumber: 'TP1685', lookupState: 'not_found', error: { code: 'NOT_FOUND_IN_AIRPORT_SNAPSHOT' } },
      { flightNumber: 'U27654', lookupState: 'error', error: { code: 'SOURCE_TIMEOUT' } },
    ] }))
    const { fetchCurrentFlights } = await loadApi()

    await expect(fetchCurrentFlights({ date: '2026-07-13', flightNumbers: ['TP1685', 'U27654'] })).resolves.toEqual([
      { flightNumber: 'TP1685', error: { code: 'not_found' } },
      { flightNumber: 'U27654', error: { code: 'flight_checker_unavailable' } },
    ])
  })

  it('fails safely when configuration is missing or the batch request is rejected', async () => {
    vi.stubEnv('VITE_FR24_API_KEY', '')
    const { fetchCurrentFlights } = await loadApi()
    await expect(fetchCurrentFlights({ date: '2026-07-13', flightNumbers: ['TP1685'] })).rejects.toMatchObject({ code: 'missing_api_key' })
    expect(fetchMock).not.toHaveBeenCalled()

    vi.stubEnv('VITE_FR24_API_KEY', 'test-key')
    fetchMock.mockResolvedValue(response({}, { ok: false, status: 401 }))
    const reloaded = await loadApi()
    await expect(reloaded.fetchCurrentFlights({ date: '2026-07-13', flightNumbers: ['TP1685'] })).rejects.toMatchObject({ code: 'unauthorized' })
  })
})
