import { doc, onSnapshot } from 'firebase/firestore'
import { normalizeServiceDay } from './api'
import { db } from './firebase'

function toDateValue(timestampLike) {
  if (!timestampLike) {
    return null
  }

  if (typeof timestampLike.toDate === 'function') {
    return timestampLike.toDate()
  }

  if (typeof timestampLike.seconds === 'number') {
    return new Date(timestampLike.seconds * 1000)
  }

  const parsed = new Date(timestampLike)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

export function isScrapedDocStale(cachedAt, now = new Date(), maxAgeMs = 2 * 60 * 60 * 1000) {
  const cacheDate = toDateValue(cachedAt)
  if (!cacheDate) {
    return true
  }

  return now.getTime() - cacheDate.getTime() > maxAgeMs
}

export function normalizeScrapedDoc({ date, pickups, returns }) {
  return normalizeServiceDay({ date, pickups, returns })
}

export function subscribeToScrapedDay(date, onData, onMissing, onError) {
  if (!db || !date) {
    if (typeof onMissing === 'function') {
      onMissing()
    }
    return () => {}
  }

  const dayRef = doc(db, 'scraped-data', date)

  return onSnapshot(
    dayRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        if (typeof onMissing === 'function') {
          onMissing()
        }
        return
      }

      const payload = snapshot.data() ?? {}
      const resolvedDate = payload.date ?? date

      if (typeof onData === 'function') {
        onData({
          date: resolvedDate,
          cachedAt: payload.cachedAt ?? null,
          ...normalizeScrapedDoc({
            date: resolvedDate,
            pickups: payload.pickups,
            returns: payload.returns,
          }),
        })
      }
    },
    (error) => {
      if (typeof onError === 'function') {
        onError(error)
      }
    }
  )
}
