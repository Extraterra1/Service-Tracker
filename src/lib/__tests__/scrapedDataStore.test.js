import { describe, expect, it } from 'vitest'
import { SCRAPED_DOC_MAX_AGE_MS, isScrapedDocStale } from '../scrapedDataStore'

describe('scrapedDataStore staleness', () => {
  it('uses a 30-minute default max age', () => {
    expect(SCRAPED_DOC_MAX_AGE_MS).toBe(30 * 60 * 1000)
  })

  it('returns true when cachedAt is missing', () => {
    expect(isScrapedDocStale(null)).toBe(true)
  })

  it('returns false when cache age is exactly 30 minutes', () => {
    const now = new Date('2026-03-05T10:30:00.000Z')
    const cachedAt = new Date(now.getTime() - 30 * 60 * 1000)

    expect(isScrapedDocStale(cachedAt, now)).toBe(false)
  })

  it('returns true when cache age is older than 30 minutes', () => {
    const now = new Date('2026-03-05T10:30:00.000Z')
    const cachedAt = new Date(now.getTime() - 30 * 60 * 1000 - 1)

    expect(isScrapedDocStale(cachedAt, now)).toBe(true)
  })
})
