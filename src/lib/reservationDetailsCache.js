import { fetchReservationDetails } from './reservationsApi'

export const RESERVATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000

const STORAGE_KEY = 'service-tracker:reservation-details:v1'
const inFlightRequests = new Map()
let storedEntries

export function normalizeReservationReference(reference) {
  return String(reference ?? '').trim().replace(/^0+(?=\d)/, '')
}

function getStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function loadEntries() {
  if (storedEntries) return storedEntries

  const storage = getStorage()
  if (!storage) {
    storedEntries = {}
    return storedEntries
  }

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    storedEntries = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    storedEntries = {}
  }

  return storedEntries
}

function persistEntries() {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(loadEntries()))
  } catch {
    // Reservation details remain available in memory when persistence is unavailable.
  }
}

export function readCachedReservation(reference, now = Date.now()) {
  const cacheKey = normalizeReservationReference(reference)
  if (!cacheKey) return null

  const entries = loadEntries()
  const entry = entries[cacheKey]
  if (!entry || typeof entry !== 'object' || !entry.reservation || !Number.isFinite(entry.cachedAt)) {
    return null
  }

  if (now - entry.cachedAt >= RESERVATION_CACHE_TTL_MS) {
    delete entries[cacheKey]
    persistEntries()
    return null
  }

  return entry.reservation
}

export function fetchAndCacheReservation(reference) {
  const cacheKey = normalizeReservationReference(reference)
  if (!cacheKey) return Promise.reject(new Error('Referência de reserva inválida.'))

  const existingRequest = inFlightRequests.get(cacheKey)
  if (existingRequest) return existingRequest

  const request = fetchReservationDetails(reference)
    .then((reservation) => {
      const entries = loadEntries()
      entries[cacheKey] = { reservation, cachedAt: Date.now() }
      persistEntries()
      return reservation
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey)
    })

  inFlightRequests.set(cacheKey, request)
  return request
}

export async function prefetchReservationDetails(references, { concurrency = 3 } = {}) {
  const uniqueReferences = []
  const seen = new Set()

  references.forEach((reference) => {
    const cacheKey = normalizeReservationReference(reference)
    if (!cacheKey || seen.has(cacheKey) || readCachedReservation(cacheKey)) return
    seen.add(cacheKey)
    uniqueReferences.push(reference)
  })

  const workerCount = Math.min(Math.max(Math.floor(concurrency), 1), uniqueReferences.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < uniqueReferences.length) {
      const reference = uniqueReferences[nextIndex]
      nextIndex += 1
      await fetchAndCacheReservation(reference).catch(() => null)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}
