import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workspaceSource = readFileSync('src/features/tv/TvWorkspace.jsx', 'utf8')

describe('TvWorkspace font loading', () => {
  it('loads the local Barlow weights used by the TV board', () => {
    expect(workspaceSource).toContain("import '@fontsource/barlow/500.css'")
    expect(workspaceSource).toContain("import '@fontsource/barlow/600.css'")
    expect(workspaceSource).toContain("import '@fontsource/barlow/700.css'")
  })
})
