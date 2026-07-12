import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FlightsComingSoonWorkspace from '../FlightsComingSoonWorkspace'

describe('FlightsComingSoonWorkspace', () => {
  it('presents a cinematic coming-soon message for flights', () => {
    render(<FlightsComingSoonWorkspace />)

    expect(screen.getByText('VOOS')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Proximamente…' })).toBeInTheDocument()
    expect(screen.queryByText('Uma nova forma de acompanhar os voos está a chegar.')).not.toBeInTheDocument()
  })
})
