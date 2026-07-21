import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync('src/App.css', 'utf8')

describe('TV board styles', () => {
  it('uses a fixed warm-light palette', () => {
    expect(appCss).toMatch(/\.tv-board\s*{[^}]*--tv-ink:\s*#211f1b;[^}]*--tv-muted:\s*#756f65;[^}]*background:\s*#f4efe5;/s)
    expect(appCss).toMatch(/\.tv-board-return\s*{[^}]*background:\s*#e9e2d7;/s)
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
    expect(appCss).toMatch(/\.tv-board-time-source\.is-flight\s*{[^}]*color:\s*#b52f40;/s)
  })

  it('keeps compact empty states subordinate to service times', () => {
    expect(appCss).toMatch(/@media \(max-width:[\s\S]*?\.tv-board-empty,[\s\S]*?\.tv-board-loading p\s*{[^}]*font-size:\s*1\.35rem;/)
  })
})
