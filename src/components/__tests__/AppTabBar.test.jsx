import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AppTabBar from '../AppTabBar'

describe('AppTabBar', () => {
  it('shows the three primary destinations to every user', () => {
    render(<AppTabBar activeWorkspace="services" onWorkspaceChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Voos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reservas' })).toBeInTheDocument()
  })

  it('translates tab selections to workspace navigation', async () => {
    const onWorkspaceChange = vi.fn()
    const user = userEvent.setup()
    render(<AppTabBar activeWorkspace="services" onWorkspaceChange={onWorkspaceChange} />)

    await user.click(screen.getByRole('button', { name: 'Voos' }))
    await user.click(screen.getByRole('button', { name: 'Reservas' }))
    await user.click(screen.getByRole('button', { name: 'Mapa' }))

    expect(onWorkspaceChange.mock.calls).toEqual([['flights'], ['reservations'], ['services']])
  })
})
