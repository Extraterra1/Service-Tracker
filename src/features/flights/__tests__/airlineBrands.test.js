import { describe, expect, it } from 'vitest'

import airlineCodes from '../airlineCodes.json'
import { getAirlineBrand } from '../airlineBrands'

describe('getAirlineBrand', () => {
  it('resolves every configured airline conversion to a local SVG brand', () => {
    airlineCodes.forEach(({ airline, iata }) => {
      expect(getAirlineBrand(`${iata}1234`), `${iata} · ${airline}`).toEqual(expect.objectContaining({
        name: expect.any(String),
        logoUrl: expect.stringMatching(/(?:\.svg$|^data:image\/svg\+xml)/),
      }))
    })
  })

  it('shares parent-brand artwork and ignores unknown flight prefixes', () => {
    expect(getAirlineBrand('U21234')?.name).toBe('easyJet')
    expect(getAirlineBrand('W41234')?.logoUrl).toBe(getAirlineBrand('W61234')?.logoUrl)
    expect(getAirlineBrand('ZZ1234')).toBeNull()
  })
})
