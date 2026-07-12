import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarDays, Map, Plane } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { TabBar } from '../TabBar/TabBar'

const tabs = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'flights', label: 'Voos', icon: Plane },
  { id: 'reservations', label: 'Reservas', icon: CalendarDays },
]

describe('TabBar', () => {
  it('renders the supplied tabs and marks the active destination', () => {
    render(<TabBar tabs={tabs} activeTabId="map" onChange={() => {}} />)

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Voos' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Reservas' })).toBeInTheDocument()
  })

  it('reports the selected destination', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TabBar tabs={tabs} activeTabId="map" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Reservas' }))

    expect(onChange).toHaveBeenCalledWith('reservations')
  })
})
