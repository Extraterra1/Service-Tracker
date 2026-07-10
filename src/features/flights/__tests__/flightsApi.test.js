import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

function jsonResponse(data, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(data),
  }
}

async function loadApi() {
  vi.resetModules()
  return import('../flightsApi')
}

describe('fetchFlightArrivals', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('posts flight batches directly to the configured Aviability API', async () => {
    vi.stubEnv('VITE_FLIGHTS_API_URL', 'https://flights.example.com/arrivals')
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }))
    const { fetchFlightArrivals } = await loadApi()

    await fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] })

    expect(fetchMock).toHaveBeenCalledWith('https://flights.example.com/arrivals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        airportCode: 'FNC',
        arrivalDate: '2026-07-10',
        flightNumbers: ['TP1685'],
      }),
    })
  })

  it('defaults to the deployed Aviability endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }))
    const { fetchFlightArrivals } = await loadApi()

    await fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://fncfutures.vercel.app/arrivals',
      expect.any(Object),
    )
  })

  it('returns a valid empty response without calling the API', async () => {
    const { fetchFlightArrivals } = await loadApi()

    await expect(fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: [] })).resolves.toEqual({
      source: 'flightview',
      airportCode: 'FNC',
      arrivalDate: '2026-07-10',
      summary: { requested: 0, resolved: 0, failed: 0 },
      results: [],
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends 21 flights as sequential batches of 20 and 1 and preserves result order', async () => {
    let resolveFirst
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const flights = Array.from({ length: 21 }, (_, index) => `TP${index + 100}`)
    fetchMock
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(jsonResponse({
        results: [{ flightNumber: flights[20], status: 'scheduled' }],
      }))
    const { fetchFlightArrivals } = await loadApi()

    const request = fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: flights })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveFirst(jsonResponse({
      results: flights.slice(0, 20).map((flightNumber) => ({ flightNumber, status: 'landed' })),
    }))
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondBody.flightNumbers).toEqual([flights[20]])
    expect((await request).results.map(({ flightNumber }) => flightNumber)).toEqual(flights)
  })

  it('recomputes the merged summary instead of trusting batch summaries', async () => {
    const flights = Array.from({ length: 21 }, (_, index) => `FR${index + 200}`)
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        summary: { requested: 999, resolved: 999, failed: 0 },
        results: flights.slice(0, 20).map((flightNumber) => ({ flightNumber, status: 'scheduled' })),
      }))
      .mockResolvedValueOnce(jsonResponse({
        summary: { requested: 0, resolved: 0, failed: 0 },
        results: [{ flightNumber: flights[20], error: { code: 'not_found' } }],
      }))
    const { fetchFlightArrivals } = await loadApi()

    const response = await fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: flights })

    expect(response.summary).toEqual({ requested: 21, resolved: 20, failed: 1 })
  })

  it('counts every non-error API result as resolved even when it has no status field', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      results: [{ flightNumber: 'TP1685', scheduledArrivalLocal: '09:30' }],
    }))
    const { fetchFlightArrivals } = await loadApi()

    const response = await fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] })

    expect(response.summary).toEqual({ requested: 1, resolved: 1, failed: 0 })
  })

  it('rejects non-success API responses with a safe error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 429 }))
    const { fetchFlightArrivals } = await loadApi()

    await expect(
      fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] }),
    ).rejects.toThrow('Aviability API error (429)')
  })

  it('propagates transport and invalid JSON errors to the workspace retry flow', async () => {
    const transportError = new Error('network unavailable')
    fetchMock.mockRejectedValueOnce(transportError)
    const { fetchFlightArrivals } = await loadApi()

    await expect(
      fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] }),
    ).rejects.toBe(transportError)

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockRejectedValue(new SyntaxError('invalid JSON')) })
    await expect(
      fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] }),
    ).rejects.toThrow('invalid JSON')
  })
})
