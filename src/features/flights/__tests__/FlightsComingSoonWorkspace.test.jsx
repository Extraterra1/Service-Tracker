import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FlightsComingSoonWorkspace from '../FlightsComingSoonWorkspace'

describe('FlightsComingSoonWorkspace', () => {
  it('identifies the future flights section as coming soon', () => {
    render(<FlightsComingSoonWorkspace />)

    expect(screen.getByRole('heading', { name: 'Voos' })).toBeInTheDocument()
    expect(screen.getByText('Proximamente')).toBeInTheDocument()
  })
})
