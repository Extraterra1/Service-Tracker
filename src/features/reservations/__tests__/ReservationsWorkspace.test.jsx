import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

const appCss = readFileSync('src/App.css', 'utf8')

const fetchReservations = vi.fn()
vi.mock('../../../lib/reservationsApi', () => ({ fetchReservations }))

let ReservationsWorkspace
try {
  ;({ default: ReservationsWorkspace } = await import('../ReservationsWorkspace'))
} catch {
  // The first TDD run intentionally happens before the workspace exists.
}

const payload = {
  page: 1,
  pageSize: 10,
  totalPages: 6,
  totalRows: 51,
  statusCounts: { confirmed: 50, cancelled: 1 },
  reservations: [
    {
      id: '1',
      reference: '000123',
      customer: 'Maria Silva',
      country: 'PT',
      clientPhone: '+351 900 000 000',
      clientEmail: 'maria@example.com',
      status: 'confirmed',
      vehicleGroup: 'c',
      licensePlate: 'AA-00-AA',
      pickupAt: '2026-07-01 09:00:00',
      pickupStation: 'aeroporto',
      returnAt: '2026-07-05 10:00:00',
      returnStation: 'sede',
      origin: 'DIRECT',
      manualValue: '125.50',
      deliveryComments: 'Cadeira de bebé',
      returnComments: '',
      arrivalFlight: 'TP123',
      bookingChannelNote: 'Cliente habitual',
    },
  ],
}

describe('ReservationsWorkspace', () => {
  beforeEach(() => {
    fetchReservations.mockReset()
    fetchReservations.mockResolvedValue(payload)
  })

  afterEach(cleanup)

  it('loads the latest ten reservations by default', async () => {
    expect(typeof ReservationsWorkspace).toBe('function')
    render(<ReservationsWorkspace />)

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('51')).toBeInTheDocument()
    expect(screen.getByText('AA-00-AA')).toBeInTheDocument()
    expect(fetchReservations).toHaveBeenCalledWith({ page: 1, pageSize: 10, q: '', status: [] })
    expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
  })

  it('keeps each reservation item focused on operational scan fields', async () => {
    render(<ReservationsWorkspace />)

    const item = await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i })
    expect(item).toHaveTextContent('Maria Silva')
    expect(item).toHaveTextContent('Confirmada')
    expect(item).toHaveTextContent('2026-07-01 09:00:00')
    expect(item).toHaveTextContent('2026-07-05 10:00:00')
    expect(item).toHaveTextContent('c')
    expect(item).toHaveTextContent('AA-00-AA')
    expect(item.querySelector('[title="Portugal"]')).not.toBeNull()
    expect(item).not.toHaveTextContent('000123')
    expect(item).not.toHaveTextContent('+351 900 000 000')
    expect(item).not.toHaveTextContent('maria@example.com')
    expect(item).not.toHaveTextContent('aeroporto')
    expect(item).not.toHaveTextContent('DIRECT')
    expect(item).not.toHaveTextContent('Cadeira de bebé')
    expect(item).not.toHaveTextContent('TP123')
  })

  it('opens every available booking detail and restores focus when closed', async () => {
    const user = userEvent.setup()
    render(<ReservationsWorkspace />)
    const item = await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i })

    await user.click(item)

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const details = within(dialog)
    expect(details.getByText('Maria Silva')).toBeInTheDocument()
    expect(details.getByText('+351 900 000 000')).toBeInTheDocument()
    expect(details.getByText('maria@example.com')).toBeInTheDocument()
    expect(details.getByText('aeroporto')).toBeInTheDocument()
    expect(details.getByText('sede')).toBeInTheDocument()
    expect(details.getByText(/125,50/)).toBeInTheDocument()
    expect(details.getByText('Cadeira de bebé')).toBeInTheDocument()
    expect(details.getByText('TP123')).toBeInTheDocument()
    expect(details.getByText('Cliente habitual')).toBeInTheDocument()

    await user.click(details.getByRole('button', { name: 'Fechar detalhes da reserva' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(item).toHaveFocus()
  })

  it('closes reservation details with Escape', async () => {
    const user = userEvent.setup()
    render(<ReservationsWorkspace />)
    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))
    expect(screen.getByRole('dialog', { name: /Reserva 000123/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows ten structural skeleton rows while reservations are loading', () => {
    fetchReservations.mockReturnValue(new Promise(() => {}))

    render(<ReservationsWorkspace />)

    expect(screen.getByLabelText('Reservas')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByTestId('reservation-skeleton')).toHaveLength(10)
  })

  it('debounces search and supports combined status filters', async () => {
    const user = userEvent.setup()
    render(<ReservationsWorkspace />)
    await screen.findByText('Maria Silva')

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar reservas' }), 'Maria')
    await user.click(screen.getByRole('button', { name: 'Cancelada' }))

    await waitFor(() => {
      expect(fetchReservations).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        q: 'Maria',
        status: ['cancelled'],
      })
    })
  })

  it('paginates and retries failed requests', async () => {
    const user = userEvent.setup()
    fetchReservations.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(payload)
    render(<ReservationsWorkspace />)

    expect(await screen.findByText('Não foi possível carregar as reservas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página seguinte' }))
    await waitFor(() => {
      expect(fetchReservations).toHaveBeenLastCalledWith({ page: 2, pageSize: 10, q: '', status: [] })
    })
  })

  it('provides responsive, focused, reduced-motion-safe visual feedback', () => {
    expect(appCss).toMatch(/\.reservation-item:focus-visible\s*{[^}]*outline:/s)
    expect(appCss).toMatch(/\.reservation-item-skeleton\s*{[^}]*animation:/s)
    expect(appCss).toMatch(/\.reservation-details-backdrop\s*{[^}]*position:\s*fixed/s)
    expect(appCss).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.reservation-item\s*{/)
    expect(appCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.reservation-item-skeleton/)
  })
})
