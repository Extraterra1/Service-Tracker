import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../CurrentFlightsWorkspace', () => ({
  default: () => <main aria-label="Voos atuais">Voos atuais</main>,
}))

import FlightsAccessWorkspace from '../FlightsAccessWorkspace'

describe('FlightsAccessWorkspace', () => {
  it('shows the coming-soon visual to non-admin users', () => {
    render(<FlightsAccessWorkspace canManageAccess={false} />)

    expect(screen.getByRole('heading', { name: 'Proximamente…' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Voos atuais')).not.toBeInTheDocument()
  })

  it('shows the live flights workspace to admins', () => {
    render(<FlightsAccessWorkspace canManageAccess />)

    expect(screen.getByLabelText('Voos atuais')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Proximamente…' })).not.toBeInTheDocument()
  })
})
