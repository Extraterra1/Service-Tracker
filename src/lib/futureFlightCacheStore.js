import { Timestamp, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { normalizeFlightNumber } from '../features/flights/flightNumbers'
import { db } from './firebaseDb'
import { toTimestampMs } from './timestamp'

export const FUTURE_FLIGHT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const FUTURE_FLIGHT_REFRESH_LEASE_MS = 45 * 1000

const futureFlightMemoryCache = new Map()

function normalizeFlightSet(values = []) {
  return [...new Set(values.map(normalizeFlightNumber).filter(Boolean))].sort()
}

function normalizeResults(results = []) {
  return results
    .filter((result) => result && typeof result === 'object')
    .map((result) => ({ ...result, flightNumber: normalizeFlightNumber(result.flightNumber) }))
    .filter((result) => result.flightNumber)
}

function rememberFutureFlightCache({ date, cachedAt, flightNumbers, results }) {
  if (!date) return null
  const cache = {
    date,
    cachedAt: cachedAt ?? new Date(),
    flightNumbers: normalizeFlightSet(flightNumbers),
    results: normalizeResults(results),
  }
  futureFlightMemoryCache.set(date, cache)
  return cache
}

export function getFutureFlightMemoryCache(date) {
  return futureFlightMemoryCache.get(date) ?? null
}

export function doesFutureFlightCacheMatch(cache, flightNumbers) {
  if (!cache) return false
  const cachedFlights = normalizeFlightSet(cache.flightNumbers)
  const requestedFlights = normalizeFlightSet(flightNumbers)
  return cachedFlights.length === requestedFlights.length
    && cachedFlights.every((flight, index) => flight === requestedFlights[index])
}

export function isFutureFlightCacheFresh(cache, flightNumbers, now = new Date()) {
  if (!cache) return false
  const cachedAtMs = toTimestampMs(cache.cachedAt, Number.NaN)
  if (!Number.isFinite(cachedAtMs) || now.getTime() - cachedAtMs > FUTURE_FLIGHT_CACHE_MAX_AGE_MS) return false
  return doesFutureFlightCacheMatch(cache, flightNumbers)
}

export function subscribeToFutureFlightDay(date, onData, onMissing, onError) {
  if (!db || !date) {
    onMissing?.()
    return () => {}
  }
  return onSnapshot(
    doc(db, 'future_flight_cache', date),
    (snapshot) => {
      if (!snapshot.exists()) {
        onMissing?.()
        return
      }
      const payload = snapshot.data({ serverTimestamps: 'estimate' }) ?? {}
      onData?.(rememberFutureFlightCache({
        date,
        cachedAt: payload.cachedAt ?? null,
        flightNumbers: payload.flightNumbers,
        results: payload.results,
      }))
    },
    (error) => onError?.(error),
  )
}

export async function saveFutureFlightCache({ date, flightNumbers, results, userUid }) {
  if (!db || !date) return false
  rememberFutureFlightCache({ date, cachedAt: new Date(), flightNumbers, results })
  await setDoc(doc(db, 'future_flight_cache', date), {
    date,
    flightNumbers: normalizeFlightSet(flightNumbers),
    results: normalizeResults(results),
    source: 'flightview-future',
    cachedAt: serverTimestamp(),
    updatedByUid: String(userUid ?? 'unknown'),
  })
  return true
}

export async function tryAcquireFutureFlightRefreshLease({ date, userUid, cacheVersion, nowMs = Date.now() }) {
  if (!db || !date) return { acquired: true, reason: 'lock_check_skipped' }
  const lockRef = doc(db, 'future_flight_refresh_locks', date)
  try {
    const acquired = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(lockRef)
      if (snapshot.exists() && toTimestampMs(snapshot.data()?.leaseUntil, 0) > nowMs) return false
      transaction.set(lockRef, {
        date,
        ownerUid: String(userUid ?? 'unknown'),
        cacheVersion: String(cacheVersion ?? 'missing'),
        leaseUntil: Timestamp.fromMillis(nowMs + FUTURE_FLIGHT_REFRESH_LEASE_MS),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      return true
    })
    return acquired ? { acquired: true, reason: 'lease_acquired' } : { acquired: false, reason: 'locked' }
  } catch (error) {
    console.warn('Future flight refresh lock check failed. Continuing without lock.', error)
    return { acquired: true, reason: 'lock_check_failed' }
  }
}
