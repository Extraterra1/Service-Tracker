import { describe, expect, it } from 'vitest'

import { canViewLiveFlights } from '../flightAccess'

describe('canViewLiveFlights', () => {
  it('allows admins', () => {
    expect(canViewLiveFlights({ canManageAccess: true })).toBe(true)
  })

  it('allows the configured dev account only in development', () => {
    expect(canViewLiveFlights({
      userEmail: ' DEV@justdrivemadeira.com ',
      devEmail: 'dev@justdrivemadeira.com',
      isDev: true,
    })).toBe(true)
    expect(canViewLiveFlights({
      userEmail: 'dev@justdrivemadeira.com',
      devEmail: 'dev@justdrivemadeira.com',
      isDev: false,
    })).toBe(false)
  })

  it('does not grant other staff accounts live-flight access', () => {
    expect(canViewLiveFlights({
      userEmail: 'staff@justdrivemadeira.com',
      devEmail: 'dev@justdrivemadeira.com',
      isDev: true,
    })).toBe(false)
  })
})
