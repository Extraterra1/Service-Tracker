import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import FlightsWorkspaceSkeleton from '../FlightsWorkspaceSkeleton'

describe('FlightsWorkspaceSkeleton', () => {
  afterEach(cleanup)

  it('mirrors the structure of four arrival rows', () => {
    render(<FlightsWorkspaceSkeleton />)

    const rows = screen.getAllByTestId('flight-skeleton-row')
    expect(rows).toHaveLength(4)

    rows.forEach((row) => {
      expect(within(row).getByTestId('flight-skeleton-identity')).toBeInTheDocument()
      expect(within(row).getAllByTestId('flight-skeleton-time')).toHaveLength(3)
      expect(within(row).getByTestId('flight-skeleton-status')).toBeInTheDocument()
      expect(within(row).getByTestId('flight-skeleton-source')).toBeInTheDocument()
      expect(within(row).getByTestId('flight-skeleton-client')).toBeInTheDocument()
    })
  })

  it('staggers the pulse gently between rows', () => {
    render(<FlightsWorkspaceSkeleton />)

    expect(screen.getAllByTestId('flight-skeleton-row').map((row) => row.style.getPropertyValue('--skeleton-delay')))
      .toEqual(['0ms', '100ms', '200ms', '300ms'])
  })
})
