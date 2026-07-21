import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync('src/App.css', 'utf8')

describe('TV board styles', () => {
  it('uses the branded JustDrive light palette', () => {
    expect(appCss).toMatch(/\.tv-board\s*{[^}]*--tv-brand:\s*#fe3a4f;/s)
    expect(appCss).toMatch(/\.tv-board\s*{[^}]*--tv-ink:\s*#3f3b3a;/s)
    expect(appCss).toMatch(/\.tv-board-delivery\s*{[^}]*background:\s*#fff0f2;/s)
    expect(appCss).toMatch(/\.tv-board-return\s*{[^}]*border-top:\s*2px solid var\(--tv-brand\);/s)
    expect(appCss).toMatch(/\.tv-board-return\s*{[^}]*background:\s*#f3eeea;/s)
    expect(appCss).toMatch(/\.tv-board-heading p\s*{[^}]*color:\s*var\(--tv-brand\);/s)
  })

  it('positions the JustDrive logo in the top-right without a container', () => {
    expect(appCss).toMatch(/\.tv-board-brand\s*{[^}]*position:\s*absolute;[^}]*top:[^}]*right:[^}]*width:\s*clamp\(/s)
    expect(appCss).not.toMatch(/\.tv-board-brand\s*{[^}]*(?:background|box-shadow|border):/s)
  })

  it('uses the squared Barlow family only within the TV board', () => {
    expect(appCss).toMatch(/\.tv-board\s*{[^}]*font-family:\s*'Barlow', system-ui, sans-serif;/s)
  })

  it('keeps a compact two-column layout around the 961 by 541 target', () => {
    expect(appCss).toMatch(/@media \(max-width:\s*1100px\) and \(max-height:\s*650px\) and \(min-aspect-ratio:\s*4 \/ 3\)/)
    expect(appCss).toMatch(/@media \(max-width:[\s\S]*?\.tv-board-section\s*{[^}]*grid-template-columns:\s*7\.6rem minmax\(0, 1fr\);/)
    expect(appCss).toMatch(/@media \(max-width:[\s\S]*?\.tv-board-service\s*{[^}]*grid-template-columns:\s*minmax\(12\.5rem, 0\.72fr\) minmax\(0, 1\.28fr\);/)
  })

  it('uses no decorative side stripe or ornamental index styling', () => {
    expect(appCss).not.toMatch(/\.tv-board-delivery::before/)
    expect(appCss).not.toMatch(/\.tv-board-index/)
    expect(appCss).toMatch(/\.tv-board-time-source\.is-flight\s*{[^}]*color:\s*var\(--tv-brand\);/s)
  })

  it('keeps compact empty states subordinate to service times', () => {
    expect(appCss).toMatch(/@media \(max-width:[\s\S]*?\.tv-board-empty,[\s\S]*?\.tv-board-loading p\s*{[^}]*font-size:\s*1\.35rem;/)
  })
})
