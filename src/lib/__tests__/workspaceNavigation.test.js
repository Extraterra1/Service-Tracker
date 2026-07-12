import { describe, expect, it } from 'vitest'

let getFutureFlightsStartDate
let getPrimaryTabId
let resolveWorkspace
try {
  ;({ getFutureFlightsStartDate, getPrimaryTabId, resolveWorkspace } = await import('../workspaceNavigation'))
} catch {
  // The first TDD run intentionally happens before navigation exists.
}

describe('workspaceNavigation', () => {
  it('allows every approved user to resolve the flights hash', () => {
    expect(resolveWorkspace('#voos', true)).toBe('flights')
    expect(resolveWorkspace('#voos', false)).toBe('flights')
  })

  it('keeps future flights as a separate admin-only workspace', () => {
    expect(resolveWorkspace('#voos-futuros', true)).toBe('futureFlights')
    expect(resolveWorkspace('#voos-futuros', false)).toBe('services')
  })

  it('allows every approved user to resolve the reservations hash', () => {
    expect(resolveWorkspace('#reservas', true)).toBe('reservations')
    expect(resolveWorkspace('#reservas', false)).toBe('reservations')
    expect(resolveWorkspace('', true)).toBe('services')
    expect(resolveWorkspace('#unknown', true)).toBe('services')
  })

  it('allows every authorized user to resolve the keyring hash', () => {
    expect(resolveWorkspace('#porta-chaves', true)).toBe('keyrings')
    expect(resolveWorkspace('#porta-chaves', false)).toBe('keyrings')
    expect(resolveWorkspace('#unknown', false)).toBe('services')
  })

  it('starts future flights on the day after the service date', () => {
    expect(getFutureFlightsStartDate('2026-07-12')).toBe('2026-07-13')
  })

  it('maps primary workspaces to bottom navigation tabs', () => {
    expect(getPrimaryTabId('services')).toBe('map')
    expect(getPrimaryTabId('flights')).toBe('flights')
    expect(getPrimaryTabId('reservations')).toBe('reservations')
    expect(getPrimaryTabId('futureFlights')).toBe('')
    expect(getPrimaryTabId('keyrings')).toBe('')
  })
})
