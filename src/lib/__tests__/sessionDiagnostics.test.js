import { describe, expect, it } from 'vitest'
import { createSessionDiagnosticsStore } from '../sessionDiagnostics'

function createMemoryStorage() {
  const data = new Map()

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    }
  }
}

describe('sessionDiagnostics', () => {
  it('records token timing metadata without storing sensitive auth fields', () => {
    const store = createSessionDiagnosticsStore({
      storage: createMemoryStorage(),
      now: () => '2026-03-13T12:00:00.000Z',
      maxEvents: 10
    })

    store.recordAppBoot({
      displayMode: 'standalone',
      isStandalone: true
    })
    store.recordAuthState({
      uid: 'uid-1',
      email: 'staff@example.com',
      displayName: 'Staff Member'
    })
    store.recordIdTokenTiming({
      authTime: '2026-03-13T11:00:00.000Z',
      issuedAtTime: '2026-03-13T11:59:00.000Z',
      expirationTime: '2026-03-13T12:59:00.000Z'
    })

    const report = store.getReport()
    const serializedReport = JSON.stringify(report)

    expect(report.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'auth_state_changed',
          payload: expect.objectContaining({
            uid: 'uid-1',
            isSignedIn: true
          })
        }),
        expect.objectContaining({
          type: 'id_token_timing',
          payload: {
            authTime: '2026-03-13T11:00:00.000Z',
            issuedAtTime: '2026-03-13T11:59:00.000Z',
            expirationTime: '2026-03-13T12:59:00.000Z'
          }
        })
      ])
    )
    expect(serializedReport).not.toContain('staff@example.com')
    expect(serializedReport).not.toContain('Staff Member')
  })

  it('classifies a null auth transition after explicit sign-out separately from an unexpected logout', () => {
    const store = createSessionDiagnosticsStore({
      storage: createMemoryStorage(),
      now: () => '2026-03-13T12:00:00.000Z',
      maxEvents: 10
    })

    store.recordAuthState({ uid: 'uid-1' })
    store.markExplicitSignOutStart()
    store.recordAuthState(null)

    const explicitSignOutReport = store.getReport()
    const explicitSignOutEvent = explicitSignOutReport.events.at(-1)
    expect(explicitSignOutEvent).toEqual(
      expect.objectContaining({
        type: 'auth_state_changed',
        payload: expect.objectContaining({
          isSignedIn: false,
          logoutReason: 'explicit'
        })
      })
    )

    const unexpectedLogoutStore = createSessionDiagnosticsStore({
      storage: createMemoryStorage(),
      now: () => '2026-03-13T12:00:00.000Z',
      maxEvents: 10
    })

    unexpectedLogoutStore.recordAuthState({ uid: 'uid-2' })
    unexpectedLogoutStore.recordAuthState(null)

    const unexpectedLogoutEvent = unexpectedLogoutStore.getReport().events.at(-1)
    expect(unexpectedLogoutEvent).toEqual(
      expect.objectContaining({
        type: 'auth_state_changed',
        payload: expect.objectContaining({
          isSignedIn: false,
          logoutReason: 'unexpected'
        })
      })
    )
  })
})
