import { beforeEach, describe, expect, it, vi } from 'vitest'

const firebaseMocks = vi.hoisted(() => {
  const app = { name: 'shared-service-tracker-app' }
  const functions = { region: 'europe-west9' }

  return {
    app,
    functions,
    callable: vi.fn(),
    getFunctions: vi.fn(() => functions),
    httpsCallable: vi.fn(),
  }
})

vi.mock('../../../lib/firebase', () => ({
  app: firebaseMocks.app,
}))

vi.mock('firebase/functions', () => ({
  getFunctions: firebaseMocks.getFunctions,
  httpsCallable: firebaseMocks.httpsCallable,
}))

async function loadApi() {
  vi.resetModules()
  firebaseMocks.httpsCallable.mockReturnValue(firebaseMocks.callable)
  return import('../flightsApi')
}

describe('fetchFlightArrivals', () => {
  beforeEach(() => {
    firebaseMocks.callable.mockReset()
    firebaseMocks.getFunctions.mockClear()
    firebaseMocks.httpsCallable.mockReset()
  })

  it('uses the shared Firebase app, European Functions region, and flight-arrivals callable', async () => {
    firebaseMocks.callable.mockResolvedValue({ data: { results: [] } })
    const { fetchFlightArrivals } = await loadApi()

    await fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] })

    expect(firebaseMocks.getFunctions).toHaveBeenCalledWith(firebaseMocks.app, 'europe-west9')
    expect(firebaseMocks.httpsCallable).toHaveBeenCalledWith(firebaseMocks.functions, 'getFlightArrivals')
  })

  it('returns a valid empty response without initializing or calling Firebase Functions', async () => {
    const { fetchFlightArrivals } = await loadApi()

    await expect(fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: [] })).resolves.toEqual({
      source: 'flightview',
      airportCode: 'FNC',
      arrivalDate: '2026-07-10',
      summary: { requested: 0, resolved: 0, failed: 0 },
      results: [],
    })
    expect(firebaseMocks.getFunctions).not.toHaveBeenCalled()
    expect(firebaseMocks.httpsCallable).not.toHaveBeenCalled()
    expect(firebaseMocks.callable).not.toHaveBeenCalled()
  })

  it('sends 21 flights as sequential batches of 20 and 1 and preserves result order', async () => {
    let resolveFirst
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const flights = Array.from({ length: 21 }, (_, index) => `TP${index + 100}`)
    firebaseMocks.callable
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({
        data: { results: [{ flightNumber: flights[20], status: 'scheduled' }] },
      })
    const { fetchFlightArrivals } = await loadApi()

    const request = fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: flights })
    expect(firebaseMocks.callable).toHaveBeenCalledTimes(1)
    expect(firebaseMocks.callable).toHaveBeenNthCalledWith(1, {
      arrivalDate: '2026-07-10',
      flightNumbers: flights.slice(0, 20),
    })

    resolveFirst({
      data: {
        results: flights.slice(0, 20).map((flightNumber) => ({ flightNumber, status: 'landed' })),
      },
    })
    await vi.waitFor(() => expect(firebaseMocks.callable).toHaveBeenCalledTimes(2))
    expect(firebaseMocks.callable).toHaveBeenNthCalledWith(2, {
      arrivalDate: '2026-07-10',
      flightNumbers: [flights[20]],
    })

    const response = await request
    expect(response.results.map(({ flightNumber }) => flightNumber)).toEqual(flights)
  })

  it('recomputes the merged summary instead of trusting batch summaries', async () => {
    const flights = Array.from({ length: 21 }, (_, index) => `FR${index + 200}`)
    firebaseMocks.callable
      .mockResolvedValueOnce({
        data: {
          summary: { requested: 999, resolved: 999, failed: 0 },
          results: flights.slice(0, 20).map((flightNumber) => ({ flightNumber, status: 'scheduled' })),
        },
      })
      .mockResolvedValueOnce({
        data: {
          summary: { requested: 0, resolved: 0, failed: 0 },
          results: [{ flightNumber: flights[20], error: { code: 'not_found' } }],
        },
      })
    const { fetchFlightArrivals } = await loadApi()

    const response = await fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: flights })

    expect(response.summary).toEqual({ requested: 21, resolved: 20, failed: 1 })
  })

  it('counts every non-error backend result as resolved even when it has no status field', async () => {
    firebaseMocks.callable.mockResolvedValue({
      data: {
        results: [{ flightNumber: 'TP1685', scheduledArrivalLocal: '09:30' }],
      },
    })
    const { fetchFlightArrivals } = await loadApi()

    const response = await fetchFlightArrivals({
      arrivalDate: '2026-07-10',
      flightNumbers: ['TP1685'],
    })

    expect(response.summary).toEqual({ requested: 1, resolved: 1, failed: 0 })
  })

  it('propagates callable transport errors', async () => {
    const transportError = new Error('network unavailable')
    firebaseMocks.callable.mockRejectedValue(transportError)
    const { fetchFlightArrivals } = await loadApi()

    await expect(
      fetchFlightArrivals({ arrivalDate: '2026-07-10', flightNumbers: ['TP1685'] }),
    ).rejects.toBe(transportError)
  })
})
