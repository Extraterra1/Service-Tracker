import { describe, expect, it } from 'vitest'

import {
  getPickupFlightNumbers,
  normalizeFlightNumber,
} from '../flightNumbers'

describe('normalizeFlightNumber', () => {
  it('returns an empty string for a null value', () => {
    expect(normalizeFlightNumber(null)).toBe('')
  })

  it('trims outer whitespace, removes internal whitespace, and uppercases the value', () => {
    expect(normalizeFlightNumber('  tp\t16\n85  ')).toBe('TP1685')
  })
})

describe('getPickupFlightNumbers', () => {
  it('returns unique normalized pickup flight numbers in their original order', () => {
    expect(
      getPickupFlightNumbers([
        { serviceType: 'pickup', flightNumber: ' TP 1685 ' },
        { serviceType: 'pickup', flightNumber: 'tp1685' },
        { serviceType: 'return', flightNumber: 'FR 123' },
        { serviceType: 'pickup', flightNumber: ' U2 7654 ' },
      ]),
    ).toEqual(['TP1685', 'U27654'])
  })

  it('removes pickups with empty normalized flight numbers', () => {
    expect(
      getPickupFlightNumbers([
        { serviceType: 'pickup', flightNumber: '   \t\n ' },
        { serviceType: 'pickup', flightNumber: null },
        { serviceType: 'pickup', flightNumber: 'FR 123' },
      ]),
    ).toEqual(['FR123'])
  })
})
