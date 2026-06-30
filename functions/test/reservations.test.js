import assert from 'node:assert/strict'
import test from 'node:test'

let createReservationsHandler
try {
  ;({ createReservationsHandler } = await import('../src/reservations.js'))
} catch {
  // The first TDD run intentionally happens before the bridge exists.
}

function makeDb(profile) {
  return {
    doc(path) {
      assert.match(path, /^staff_allowlist\//)
      return {
        async get() {
          return {
            exists: profile !== null,
            data: () => profile,
          }
        },
      }
    },
  }
}

function makeHandler({ profile = { active: true, role: 'admin' }, fetchImpl } = {}) {
  return createReservationsHandler({
    db: makeDb(profile),
    getServiceKey: () => 'service-tracker-secret-at-least-32-characters',
    apiBaseUrl: 'https://api.justdrivemadeira.com',
    fetchImpl,
  })
}

test('exports a callable reservations handler factory', () => {
  assert.equal(typeof createReservationsHandler, 'function')
})

test('rejects unauthenticated and non-admin callers', async () => {
  const handler = makeHandler()
  await assert.rejects(() => handler({ auth: null, data: {} }), { code: 'unauthenticated' })

  const staffHandler = makeHandler({ profile: { active: true, role: 'staff' } })
  await assert.rejects(
    () => staffHandler({ auth: { uid: 'staff-1' }, data: {} }),
    { code: 'permission-denied' },
  )

  const inactiveHandler = makeHandler({ profile: { active: false, role: 'admin' } })
  await assert.rejects(
    () => inactiveHandler({ auth: { uid: 'admin-1' }, data: {} }),
    { code: 'permission-denied' },
  )
})

test('validates reservation filters before calling cPanel', async () => {
  const handler = makeHandler({ fetchImpl: async () => assert.fail('fetch should not run') })

  await assert.rejects(
    () => handler({ auth: { uid: 'admin-1' }, data: { pageSize: 500 } }),
    { code: 'invalid-argument' },
  )
  await assert.rejects(
    () => handler({ auth: { uid: 'admin-1' }, data: { status: ['unknown'] } }),
    { code: 'invalid-argument' },
  )
})

test('forwards normalized filters and the private service key', async () => {
  let capturedUrl
  let capturedOptions
  const payload = {
    page: 2,
    pageSize: 10,
    totalPages: 8,
    totalRows: 80,
    statusCounts: { confirmed: 80 },
    reservations: [{ id: '1', reference: '000123' }],
  }
  const handler = makeHandler({
    fetchImpl: async (url, options) => {
      capturedUrl = new URL(url)
      capturedOptions = options
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  const result = await handler({
    auth: { uid: 'admin-1' },
    data: { page: 2, pageSize: 10, q: '  ABC  ', status: ['confirmed', 'confirmed'] },
  })

  assert.deepEqual(result, payload)
  assert.equal(capturedUrl.origin, 'https://api.justdrivemadeira.com')
  assert.equal(capturedUrl.pathname, '/api/internal/reservations')
  assert.equal(capturedUrl.searchParams.get('page'), '2')
  assert.equal(capturedUrl.searchParams.get('pageSize'), '10')
  assert.equal(capturedUrl.searchParams.get('q'), 'ABC')
  assert.equal(capturedUrl.searchParams.get('status'), 'confirmed')
  assert.equal(capturedOptions.headers['X-JD-Service-Tracker-Key'], 'service-tracker-secret-at-least-32-characters')
  assert.ok(capturedOptions.signal instanceof AbortSignal)
})

test('maps cPanel failures to stable callable errors', async () => {
  const rateLimited = makeHandler({
    fetchImpl: async () => new Response('{}', { status: 429, headers: { 'Content-Type': 'application/json' } }),
  })
  await assert.rejects(
    () => rateLimited({ auth: { uid: 'admin-1' }, data: {} }),
    { code: 'resource-exhausted' },
  )

  const unavailable = makeHandler({ fetchImpl: async () => { throw new Error('network down') } })
  await assert.rejects(
    () => unavailable({ auth: { uid: 'admin-1' }, data: {} }),
    { code: 'unavailable' },
  )
})
