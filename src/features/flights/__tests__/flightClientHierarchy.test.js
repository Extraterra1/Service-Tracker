import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync('src/App.css', 'utf8')

describe('flight client visual hierarchy', () => {
  it('contains clients in a compact inset section', () => {
    expect(appCss).toMatch(/\.flight-clients\s*{[\s\S]*?padding:[^;]+;[\s\S]*?border-radius:[^;]+;[\s\S]*?background:[^;]+;/)
    expect(appCss).toMatch(/\.flight-clients-label\s*{[\s\S]*?font-size:\s*0\.5\drem;/)
    expect(appCss).toMatch(/\.flight-client-name\s*{[^}]*font-size:\s*0\.8rem;/)
    expect(appCss).toMatch(/\.flight-client\s*{[\s\S]*?padding:\s*0\.45rem/)
  })

  it('keeps the phone text neutral and only the WhatsApp icon green', () => {
    expect(appCss).toMatch(/\.flight-client-phone\s*{[^}]*color:\s*var\(--text\);/)
    expect(appCss).toMatch(/\.flight-client-phone svg\s*{[^}]*color:\s*var\(--ready-green\);/)
  })
})
