import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

const appCss = readFileSync('src/App.css', 'utf8')

const mocks = vi.hoisted(() => ({
  fetchCurrentFlights: vi.fn(),
  getFlightStatusMemoryCache: vi.fn(),
  subscribeToFlightStatusDay: vi.fn(),
  saveFlightStatusCache: vi.fn(),
  tryAcquireFlightStatusRefreshLease: vi.fn(),
}))
vi.mock('../currentFlightsApi', () => ({ fetchCurrentFlights: mocks.fetchCurrentFlights }))
vi.mock('../../../lib/flightStatusStore', () => ({
  FLIGHT_CACHE_MAX_AGE_MS: 300_000,
  getFlightStatusMemoryCache: mocks.getFlightStatusMemoryCache,
  isFlightStatusCacheFresh: (cache, flightNumbers, now) => {
    if (!cache?.cachedAt || now.getTime() - new Date(cache.cachedAt).getTime() > 300_000) return false
    return [...cache.flightNumbers].sort().join('|') === [...flightNumbers].sort().join('|')
  },
  subscribeToFlightStatusDay: mocks.subscribeToFlightStatusDay,
  saveFlightStatusCache: mocks.saveFlightStatusCache,
  tryAcquireFlightStatusRefreshLease: mocks.tryAcquireFlightStatusRefreshLease,
}))

import CurrentFlightsWorkspace from '../CurrentFlightsWorkspace'

const services = [
  {
    itemId: 'one',
    id: '10787',
    serviceType: 'pickup',
    flightNumber: ' TP 1685 ',
    name: 'Maria',
    car: 'Panda',
    plate: 'AA-00-AA',
    phone: '+351 912 345 678',
    reservationUrl: 'https://reservations.justdrivemadeira.com/?id=10787',
  },
  { itemId: 'two', serviceType: 'pickup', flightNumber: 'tp1685', name: 'John', car: 'Clio', plate: 'BB-11-BB' },
  { itemId: 'three', serviceType: 'pickup', flightNumber: ' U2 7654 ', name: 'Ana', car: 'Captur', plate: 'CC-22-CC' },
]

const activeResults = [
  { flightNumber: 'TP1685', status: 'scheduled', estimatedArrivalLocal: '2026-07-13T16:30', arrivalTimestampUtc: '2026-07-13T15:30:00Z' },
  { flightNumber: 'U27654', status: 'departed', estimatedArrivalLocal: '2026-07-13T17:45', arrivalTimestampUtc: '2026-07-13T16:45:00Z' },
]

function cachePayload(overrides = {}) {
  return {
    date: '2026-07-13',
    flightNumbers: ['TP1685', 'U27654'],
    results: activeResults,
    cachedAt: new Date('2026-07-13T09:59:00Z'),
    ...overrides,
  }
}

describe('CurrentFlightsWorkspace', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T10:00:00Z'))
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.saveFlightStatusCache.mockResolvedValue(true)
    mocks.tryAcquireFlightStatusRefreshLease.mockResolvedValue({ acquired: true, reason: 'lease_acquired' })
    mocks.fetchCurrentFlights.mockResolvedValue(activeResults)
    mocks.getFlightStatusMemoryCache.mockReturnValue(null)
    mocks.subscribeToFlightStatusDay.mockImplementation((_date, onData) => {
      onData(cachePayload())
      return vi.fn()
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders a fresh shared cache immediately without calling FR24 and groups matching clients', async () => {
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    const flight = screen.getByRole('article', { name: 'Voo TP1685' })
    expect(within(flight).getAllByTestId('flight-client')).toHaveLength(2)
    expect(flight).toHaveTextContent('Maria')
    expect(flight).toHaveTextContent('John')
    expect(mocks.fetchCurrentFlights).not.toHaveBeenCalled()
  })

  it('groups mobile client identity and presents a quiet reservation id action', async () => {
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    const flight = screen.getByRole('article', { name: 'Voo TP1685' })
    const client = within(flight).getAllByTestId('flight-client')[0]
    const identity = client.querySelector('.flight-client-identity')
    const actions = client.querySelector('.flight-client-actions')
    const reservationLink = within(client).getByRole('link', { name: 'Reservations 10787' })

    expect(identity).toContainElement(within(client).getByText('Maria'))
    expect(identity?.querySelector('.flight-client-flag')).toBeInTheDocument()
    expect(within(client).getByText('AA-00-AA')).toBeInTheDocument()
    expect(reservationLink).toHaveTextContent('#10787')
    expect(reservationLink.querySelector('.lucide-eye')).toHaveAttribute('aria-hidden', 'true')
    expect(actions?.children[0]).toHaveClass('flight-client-phone')
    expect(actions?.children[1]).toBe(reservationLink)
  })

  it('hides client actions in the compact current-flight mobile layout', () => {
    expect(appCss).toMatch(
      /\.flight-row--single-time \.flight-client-actions\s*{\s*display:\s*none;/
    )
  })

  it('centers the stacked desktop client actions', () => {
    expect(appCss).toMatch(
      /\.flight-client-actions\s*{[^}]*align-items:\s*center;[^}]*justify-content:\s*space-around;/
    )
  })

  it('renders session-cached flights immediately while Firestore reconnects after a tab switch', async () => {
    mocks.getFlightStatusMemoryCache.mockReturnValue(cachePayload())
    mocks.subscribeToFlightStatusDay.mockImplementation((_date, _onData, _onMissing, onError) => {
      onError(new Error('permission denied'))
      return vi.fn()
    })

    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)

    expect(screen.getByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument()
    expect(screen.queryByLabelText('A carregar voos')).not.toBeInTheDocument()
    expect(screen.queryByText('Não foi possível ler os voos guardados.')).not.toBeInTheDocument()
    await act(async () => {})
    expect(mocks.fetchCurrentFlights).not.toHaveBeenCalled()
  })

  it('shows one operational arrival time and uses No ar for departed flights', async () => {
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    const scheduled = screen.getByRole('article', { name: 'Voo TP1685' })
    const airborne = screen.getByRole('article', { name: 'Voo U27654' })
    expect(scheduled).toHaveClass('flight-row--single-time', 'flight-row--status-scheduled')
    expect(airborne).toHaveClass('flight-row--status-departed')
    expect(within(scheduled).getAllByRole('term')).toHaveLength(1)
    expect(scheduled).toHaveTextContent('Previsto16:30')
    expect(within(airborne).getAllByRole('term')).toHaveLength(1)
    expect(airborne).toHaveTextContent('Previsto17:45')
    expect(airborne).toHaveTextContent('No ar')
    expect(airborne).not.toHaveTextContent('Real')
  })

  it('shows prominent semantic badges for current flight statuses', async () => {
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    const scheduled = screen.getByRole('article', { name: 'Voo TP1685' })
    const airborne = screen.getByRole('article', { name: 'Voo U27654' })
    expect(within(scheduled).getByLabelText('Estado: Programado')).toHaveClass('flight-status--prominent')
    expect(within(airborne).getByLabelText('Estado: No ar')).toHaveClass('flight-status--departed')
  })

  it('acquires a lease, fetches FR24, and persists results when the shared cache is missing', async () => {
    mocks.subscribeToFlightStatusDay.mockImplementation((_date, _onData, onMissing) => {
      onMissing()
      return vi.fn()
    })
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    expect(mocks.tryAcquireFlightStatusRefreshLease).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-07-13', userUid: 'uid-1' }))
    expect(mocks.fetchCurrentFlights).toHaveBeenCalledWith({
      date: '2026-07-13',
      flightNumbers: ['TP1685', 'U27654'],
      signal: expect.any(AbortSignal),
    })
    expect(mocks.saveFlightStatusCache).toHaveBeenCalledWith({
      date: '2026-07-13',
      flightNumbers: ['TP1685', 'U27654'],
      results: activeResults,
      userUid: 'uid-1',
    })
    expect(screen.getByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument()
  })

  it('manually refreshes all flights while retaining cached rows', async () => {
    let resolveRefresh
    mocks.fetchCurrentFlights.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve }))
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})
    expect(screen.getByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar todos os voos' }))
    expect(mocks.fetchCurrentFlights).toHaveBeenCalledTimes(1)
    expect(mocks.tryAcquireFlightStatusRefreshLease).not.toHaveBeenCalled()
    expect(screen.getByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A atualizar todos os voos' })).toHaveClass('is-refreshing')
    expect(screen.getByRole('button', { name: 'A atualizar todos os voos' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'A atualizar todos os voos' })).toBeDisabled()
    await act(async () => resolveRefresh(activeResults))
    expect(screen.getByRole('button', { name: 'Atualizar todos os voos' })).toBeEnabled()
  })

  it('releases refresh-button focus after a touch interaction', async () => {
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    const refreshButton = screen.getByRole('button', { name: 'Atualizar todos os voos' })
    refreshButton.focus()
    expect(refreshButton).toHaveFocus()
    fireEvent.pointerUp(refreshButton, { pointerType: 'touch' })
    expect(refreshButton).not.toHaveFocus()
  })

  it('reserves space below mobile flight content for the fixed tab bar', () => {
    expect(appCss).toMatch(
      /@media \(max-width: 780px\)[\s\S]*?\.app-shell\s*{\s*padding: 0\.34rem 0\.34rem calc\(5\.4rem \+ env\(safe-area-inset-bottom\)\);/,
    )
  })

  it('keeps a successful flight refresh successful when cache persistence fails', async () => {
    mocks.saveFlightStatusCache.mockRejectedValueOnce(new Error('permission denied'))
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Atualizar todos os voos' }))
    })

    expect(screen.getByRole('article', { name: 'Voo TP1685' })).toHaveTextContent('16:30')
    expect(screen.queryByText('Não foi possível atualizar os voos. Verifica a ligação e tenta novamente.')).not.toBeInTheDocument()
  })

  it('checks every two minutes but only refreshes after the shared cache becomes stale', async () => {
    const { unmount } = render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})
    await act(() => vi.advanceTimersByTimeAsync(4 * 60_000))
    expect(mocks.fetchCurrentFlights).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(2 * 60_000))
    expect(mocks.fetchCurrentFlights).toHaveBeenCalledTimes(1)
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(6 * 60_000))
    expect(mocks.fetchCurrentFlights).toHaveBeenCalledTimes(1)
  })

  it('moves a landed flight to Anteriores one hour after its UTC arrival timestamp', async () => {
    mocks.subscribeToFlightStatusDay.mockImplementation((_date, onData) => {
      onData(cachePayload({ results: [
        { flightNumber: 'TP1685', status: 'arrived', actualArrivalLocal: '2026-07-13T09:59', arrivalTimestampUtc: '2026-07-13T08:59:00Z' },
        { flightNumber: 'U27654', status: 'arrived', actualArrivalLocal: '2026-07-13T10:00', arrivalTimestampUtc: '2026-07-13T09:00:00Z' },
      ] }))
      return vi.fn()
    })
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})
    const disclosure = screen.getByText('Anteriores').closest('details')
    expect(disclosure.querySelector('[aria-label="Voo TP1685"]')).toBeInTheDocument()
    expect(disclosure.querySelector('[aria-label="Voo U27654"]')).not.toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(disclosure.querySelector('[aria-label="Voo U27654"]')).toBeInTheDocument()
  })

  it('keeps successful and failed cached rows visible together', async () => {
    mocks.subscribeToFlightStatusDay.mockImplementation((_date, onData) => {
      onData(cachePayload({ results: [activeResults[0], { flightNumber: 'U27654', error: { code: 'flight_checker_unavailable' } }] }))
      return vi.fn()
    })
    render(<CurrentFlightsWorkspace selectedDate="2026-07-13" allServiceItems={services} userUid="uid-1" />)
    await act(async () => {})
    expect(screen.getByRole('article', { name: 'Voo TP1685' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Voo U27654' })).toHaveTextContent('FR24 temporariamente indisponível')
  })
})
