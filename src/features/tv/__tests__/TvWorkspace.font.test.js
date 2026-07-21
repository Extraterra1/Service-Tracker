import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workspaceSource = readFileSync('src/features/tv/TvWorkspace.jsx', 'utf8')

describe('TvWorkspace font loading', () => {
  it('loads the local Nunito variable weight font', () => {
    expect(workspaceSource).toContain("import '@fontsource-variable/nunito/wght.css'")
  })
})
