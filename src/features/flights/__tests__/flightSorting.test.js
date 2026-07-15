import { describe, expect, it } from 'vitest'
import { getEffectiveArrivalTime, sortFlightsByArrivalTime } from '../flightSorting'

describe('flight time ordering', () => {
  it('uses the displayed-time priority and orders earliest effective arrival first', () => {
    const laterEstimate = {
      flightNumber: 'TP100',
      estimatedArrivalLocal: '2026-07-15T12:00:00',
      scheduledArrivalLocal: '2026-07-15T09:00:00',
    }
    const earlierCanonicalTime = {
      flightNumber: 'U2100',
      arrivalTimeLocal: '2026-07-15T10:00:00',
      actualArrivalLocal: '2026-07-15T08:00:00',
    }

    expect(getEffectiveArrivalTime(laterEstimate)).toBe(Date.parse('2026-07-15T12:00:00'))
    expect(sortFlightsByArrivalTime([laterEstimate, earlierCanonicalTime])).toEqual([
      earlierCanonicalTime,
      laterEstimate,
    ])
  })

  it('places invalid times last, breaks ties by flight number, and preserves the input array', () => {
    const input = [
      { flightNumber: 'TP200', scheduledArrivalLocal: null },
      { flightNumber: 'U2200', scheduledArrivalLocal: 'not-a-time' },
      { flightNumber: 'FR300', scheduledArrivalLocal: '2026-07-15T11:00:00' },
      { flightNumber: 'BA100', scheduledArrivalLocal: '2026-07-15T11:00:00' },
    ]
    const originalOrder = [...input]

    expect(sortFlightsByArrivalTime(input).map((flight) => flight.flightNumber)).toEqual([
      'BA100',
      'FR300',
      'TP200',
      'U2200',
    ])
    expect(input).toEqual(originalOrder)
  })
})
