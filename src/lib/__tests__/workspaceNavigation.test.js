import { describe, expect, it } from 'vitest'

let resolveWorkspace
try {
  ;({ resolveWorkspace } = await import('../workspaceNavigation'))
} catch {
  // The first TDD run intentionally happens before navigation exists.
}

describe('workspaceNavigation', () => {
  it('resolves the flights hash for every signed-in role', () => {
    expect(resolveWorkspace('#voos', true)).toBe('flights')
    expect(resolveWorkspace('#voos', false)).toBe('flights')
  })

  it('allows only admins to resolve the reservations hash', () => {
    expect(resolveWorkspace('#reservas', true)).toBe('reservations')
    expect(resolveWorkspace('#reservas', false)).toBe('services')
    expect(resolveWorkspace('', true)).toBe('services')
    expect(resolveWorkspace('#unknown', true)).toBe('services')
  })
})
