import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const headerSource = readFileSync('src/components/AppHeaderMenu.jsx', 'utf8')
const landingSource = readFileSync('src/components/SignedOutLanding.jsx', 'utf8')

describe('JustDrive logo asset', () => {
  it.each([
    ['application header', headerSource],
    ['signed-out landing', landingSource],
  ])('uses the SVG in the %s', (_label, source) => {
    expect(source).toContain("../assets/Logo Base.svg")
    expect(source).not.toMatch(/Logo Just Drive Madeira-1\.png/)
  })
})
