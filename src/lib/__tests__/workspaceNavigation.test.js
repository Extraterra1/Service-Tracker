import { describe, expect, it } from 'vitest'

let resolveWorkspace
try {
  ;({ resolveWorkspace } = await import('../workspaceNavigation'))
} catch {
  // The first TDD run intentionally happens before navigation exists.
}

describe('workspaceNavigation', () => {
  it('allows only admins to resolve the flights hash', () => {
    expect(resolveWorkspace('#voos', true)).toBe('flights')
    expect(resolveWorkspace('#voos', false)).toBe('services')
  })

  it('allows only admins to resolve the reservations hash', () => {
    expect(resolveWorkspace('#reservas', true)).toBe('reservations')
    expect(resolveWorkspace('#reservas', false)).toBe('services')
    expect(resolveWorkspace('', true)).toBe('services')
    expect(resolveWorkspace('#unknown', true)).toBe('services')
  })

  it('allows every authorized user to resolve the keyring hash', () => {
    expect(resolveWorkspace('#porta-chaves', true)).toBe('keyrings')
    expect(resolveWorkspace('#porta-chaves', false)).toBe('keyrings')
    expect(resolveWorkspace('#unknown', false)).toBe('services')
  })
})
