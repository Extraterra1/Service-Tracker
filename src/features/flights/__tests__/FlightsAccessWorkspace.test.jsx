import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../CurrentFlightsWorkspace', () => ({
  default: () => <main aria-label="Voos atuais">Voos atuais</main>,
}))

import FlightsAccessWorkspace from '../FlightsAccessWorkspace'

describe('FlightsAccessWorkspace', () => {
  it('shows live flights to every authenticated app user', () => {
    render(<FlightsAccessWorkspace />)

    expect(screen.getByLabelText('Voos atuais')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Proximamente…' })).not.toBeInTheDocument()
  })
})
