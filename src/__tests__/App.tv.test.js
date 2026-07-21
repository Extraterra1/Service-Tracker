import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync('src/App.jsx', 'utf8')

describe('App TV workspace integration', () => {
  it('lazy-loads the TV workspace and renders it through an early chrome-free branch', () => {
    expect(appSource).toContain("const TvWorkspace = lazy(() => import('./features/tv/TvWorkspace'))")
    expect(appSource).toMatch(/if \(activeWorkspace === 'tv'\) \{[\s\S]*?return \([\s\S]*?<TvWorkspace/)
    expect(appSource).toContain('className="app-shell app-shell-tv"')
  })

  it('preserves the tv hash while resolving the active workspace', () => {
    expect(appSource).toMatch(/requestedWorkspace === 'tv'[\s\S]*?'#tv'/)
  })
})
