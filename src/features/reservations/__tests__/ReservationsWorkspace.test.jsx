import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

const appCss = readFileSync('src/App.css', 'utf8')

const fetchReservations = vi.fn()
vi.mock('../../../lib/reservationsApi', () => ({ fetchReservations }))
const writeText = vi.fn()

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
      id: '11190',
      reference: '000123',
      customer: 'Maria Silva',
      country: 'PT',
      clientPhone: '+351 900 000 000',
      clientEmail: 'maria@example.com',
      driverLicenseNumber: 'P-1234567',
      accommodationAddress: 'Hotel Madeira, Funchal',
      status: 'confirmed',
      vehicleGroup: 'c',
      carMake: 'Fiat',
      carModel: 'Panda',
      licensePlate: 'AA-00-AA',
      pickupAt: '2026-07-01 09:00:00',
      pickupStation: 'aeroporto',
      returnAt: '2026-07-05 10:00:00',
      returnStation: 'sede',
      origin: 'DIRECT',
      manualValue: '125.50',
      baseValue: '119.50',
      usageFee: '6.00',
      durationDays: 3,
      deliveryComments: 'Extras:\n1x Cadeira de bebé\n1x Taxa IMT\nNotas Cliente:\nChega cedo\nNotas Serviço:\nPreparar cadeira',
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
    writeText.mockReset()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
  })

  afterEach(cleanup)

  it('loads the latest ten reservations by default', async () => {
    expect(typeof ReservationsWorkspace).toBe('function')
    render(<ReservationsWorkspace />)

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('51')).toBeInTheDocument()
    expect(screen.getByText(/Fiat Panda - AA-00-AA/)).toBeInTheDocument()
    expect(fetchReservations).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      pickupFrom: '',
      pickupTo: '',
      q: '',
      status: [],
    })
    expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
  })

  it('keeps each reservation item focused on operational scan fields', async () => {
    render(<ReservationsWorkspace />)

    const item = await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i })
    expect(item).toHaveTextContent('Maria Silva')
    expect(item).toHaveTextContent('Confirmada')
    expect(item).toHaveTextContent('01/07/2026 09:00')
    expect(item).toHaveTextContent('05/07/2026 10:00')
    expect(item).toHaveTextContent('C')
    expect(item).toHaveTextContent('AA-00-AA')
    expect(item).toHaveTextContent('Fiat Panda')
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
    const whatsappLink = details.getByRole('link', { name: 'Abrir conversa no WhatsApp para +351 900 000 000' })
    expect(whatsappLink).toHaveTextContent('+351 900 000 000')
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/351900000000')
    expect(whatsappLink).toHaveAttribute('target', '_blank')
    expect(details.getByText('maria@example.com')).toBeInTheDocument()
    expect(details.getByText('P-1234567')).toBeInTheDocument()
    expect(details.getByText('Hotel Madeira, Funchal')).toBeInTheDocument()
    expect(details.getByText('Condutor')).toBeInTheDocument()
    expect(details.getByText('Carta de condução')).toBeInTheDocument()
    expect(details.getByText('Morada do alojamento')).toBeInTheDocument()
    expect(details.getByText('Aeroporto')).toBeInTheDocument()
    expect(details.getByText('Office')).toBeInTheDocument()
    expect(details.queryByText('Código do país')).not.toBeInTheDocument()
    expect(details.queryByText('País')).not.toBeInTheDocument()
    expect(details.getByText('Maria Silva').previousElementSibling).toHaveAttribute('title', 'Portugal')
    const popupHeader = details.getByRole('heading', { name: 'Reserva 000123' }).closest('header')
    expect(within(popupHeader).getByText('Confirmada')).toHaveClass('reservation-status', 'is-confirmed')
    expect(dialog.textContent.match(/000123/g)).toHaveLength(1)
    expect(details.queryByText('ID')).not.toBeInTheDocument()
    expect(details.queryByText('Estado')).not.toBeInTheDocument()
    expect(details.queryByText('11190')).not.toBeInTheDocument()
    const legacyLink = within(popupHeader).getByRole('link', { name: 'Ver no Reservations' })
    expect(legacyLink.querySelector('.lucide-external-link')).not.toBeNull()
    expect(legacyLink).toHaveAttribute(
      'href',
      'https://reservations.justdrivemadeira.com/index.php?controller=pjAdminBookings&action=pjActionUpdate&id=11190',
    )
    expect(legacyLink).toHaveAttribute('target', '_blank')
    expect(details.getByText('01/07/2026 09:00').closest('dd').querySelector('.lucide-calendar-arrow-up')).not.toBeNull()
    expect(details.getByText('05/07/2026 10:00').closest('dd').querySelector('.lucide-calendar-arrow-down')).not.toBeNull()
    expect(details.getByText('Aeroporto').closest('dd').querySelector('.lucide-plane')).not.toBeNull()
    expect(details.getByText('Office').closest('dd').querySelector('.lucide-building-2')).not.toBeNull()
    expect(details.getByText(/125,50/)).toBeInTheDocument()
    expect(details.getByText(/119,50/)).toBeInTheDocument()
    expect(details.getByText(/6,00/)).toBeInTheDocument()
    expect(details.getByText('3 dias').closest('dd').querySelector('.lucide-clock-3')).not.toBeNull()
    const routeSection = details.getByRole('heading', { name: 'Percurso' }).closest('section')
    expect(Array.from(routeSection.querySelectorAll('dt'), (element) => element.textContent)).toEqual([
      'Entrega',
      'Recolha',
      'Local de entrega',
      'Local de recolha',
      'Duração',
      'Voo de chegada',
    ])
    const vehicleSection = details.getByRole('heading', { name: 'Viatura' }).closest('section')
    expect(Array.from(vehicleSection.querySelectorAll('dt'), (element) => element.textContent)).toEqual([
      'Modelo',
      'Matrícula',
      'Grupo',
    ])
    expect(within(vehicleSection).getByText('Fiat Panda')).toBeInTheDocument()
    expect(within(vehicleSection).getByText('Fiat Panda').closest('dd').querySelector('.lucide-car-front')).not.toBeNull()
    expect(within(vehicleSection).getByText('AA-00-AA').closest('dd').querySelector('.lucide-rectangle-horizontal')).not.toBeNull()
    expect(within(vehicleSection).queryByText('Marca')).not.toBeInTheDocument()
    const extrasSection = details.getByRole('heading', { name: 'Extras' }).closest('section')
    expect(Array.from(extrasSection.querySelectorAll('li'), (element) => element.textContent)).toEqual([
      '1x Cadeira de bebé',
      '1x Taxa IMT',
    ])
    const notesSection = details.getByRole('heading', { name: 'Notas' }).closest('section')
    expect(within(notesSection).getByText('Chega cedo')).toBeInTheDocument()
    expect(within(notesSection).getByText('Preparar cadeira')).toBeInTheDocument()
    expect(within(notesSection).queryByText(/Extras:/)).not.toBeInTheDocument()
    expect(within(popupHeader).queryByText('Não tem taxa IMT')).not.toBeInTheDocument()
    expect(details.getByText('TP123')).toBeInTheDocument()
    expect(details.getByText('Cliente habitual')).toBeInTheDocument()

    await user.click(details.getByRole('button', { name: 'Fechar detalhes da reserva' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(item).toHaveFocus()
  })

  it('groups contract extras in the required order and keeps remaining extras under Outros', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{
        ...payload.reservations[0],
        deliveryComments: 'Extras:\n1x GPS\nSeguro de pneus\n1x Baby Seat\nCondutor adicional\nProteção total',
      }],
    })
    render(<ReservationsWorkspace />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const extrasSection = screen.getByRole('heading', { name: 'Extras' }).closest('section')
    const contractGroup = within(extrasSection).getByRole('heading', { name: 'Contrato' }).closest('div')
    const otherGroup = within(extrasSection).getByRole('heading', { name: 'Outros' }).closest('div')
    expect(Array.from(contractGroup.querySelectorAll('li'), (element) => element.textContent)).toEqual([
      'Proteção total',
      'Condutor adicional',
      '1x Baby Seat',
      '1x GPS',
    ])
    expect(Array.from(otherGroup.querySelectorAll('li'), (element) => element.textContent)).toEqual([
      'Seguro de pneus',
    ])
  })

  it('warns in the header when no reservation extra contains IMT', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{
        ...payload.reservations[0],
        pickupStation: 'Funchal',
        deliveryComments: 'Extras:\n1x Cadeira de bebé\nNotas Cliente:\nSem taxa',
      }],
    })
    render(<ReservationsWorkspace />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const details = within(dialog)
    const popupHeader = details.getByRole('heading', { name: 'Reserva 000123' }).closest('header')
    expect(within(popupHeader).getByText('Não tem taxa IMT')).toHaveClass('reservation-imt-warning')
    expect(within(popupHeader).queryByRole('link', { name: /Enviar mensagem IMT/i })).not.toBeInTheDocument()
    const commercialSection = details.getByRole('heading', { name: 'Comercial' }).closest('section')
    expect(Array.from(commercialSection.querySelectorAll('dt'), (element) => element.textContent)).toEqual(['Valor total'])
    expect(within(commercialSection).getByText(/125,50/)).toBeInTheDocument()
    expect(details.getByText('Funchal').closest('dd').querySelector('.lucide-map-pinned')).not.toBeNull()
  })

  it('lets admins open a Portuguese IMT WhatsApp message with the adjusted price', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{
        ...payload.reservations[0],
        deliveryComments: 'Extras:\n1x Cadeira de bebé',
      }],
    })
    render(<ReservationsWorkspace canManageAccess />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const popupHeader = within(dialog).getByRole('heading', { name: 'Reserva 000123' }).closest('header')
    const imtLink = within(popupHeader).getByRole('link', { name: /Enviar mensagem IMT por WhatsApp/i })
    const url = new URL(imtLink.href)
    const message = url.searchParams.get('text')

    expect(url.origin + url.pathname).toBe('https://wa.me/351900000000')
    expect(message).toContain('No seu caso, como são 3 dias de aluguer')
    expect(message).toContain('125,50€')
    expect(message).toContain('131,50€')
    expect(message).toContain('Por favor, confirme.')
  })

  it('copies the post-IMT pre-discount final price when admins click the IMT WhatsApp pill', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{
        ...payload.reservations[0],
        manualValue: '263',
        deliveryComments: 'Extras:\n1x Cadeira de bebé\nPreço original 292.22 EUR (desconto 10% PARTNER)',
      }],
    })
    render(<ReservationsWorkspace canManageAccess />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const popupHeader = within(dialog).getByRole('heading', { name: 'Reserva 000123' }).closest('header')
    const imtLink = within(popupHeader).getByRole('link', { name: /Enviar mensagem IMT por WhatsApp/i })

    expect(imtLink).toHaveAttribute('data-clipboard-price', '298.89')
  })

  it('defaults the admin IMT WhatsApp message to English for non-Portuguese clients', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{
        ...payload.reservations[0],
        country: 'GB',
        clientPhone: '+44 7700 900123',
        manualValue: '100',
        durationDays: 12,
        deliveryComments: 'Extras:\n1x Cadeira de bebé',
      }],
    })
    render(<ReservationsWorkspace canManageAccess />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const popupHeader = within(dialog).getByRole('heading', { name: 'Reserva 000123' }).closest('header')
    const imtLink = within(popupHeader).getByRole('link', { name: /Enviar mensagem IMT por WhatsApp/i })
    const message = new URL(imtLink.href).searchParams.get('text')

    expect(imtLink.href).toContain('https://wa.me/447700900123')
    expect(message).toContain('as the rental period is 12 days')
    expect(message).toContain('initially quoted amount of 100.00€')
    expect(message).toContain('bringing the total amount to 120.00€')
    expect(message).toContain("Sadly there's nothing we can do.")
  })

  it('keeps the admin IMT pill clickable even when the client phone cannot be normalized', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{
        ...payload.reservations[0],
        clientPhone: 'ver notas',
        deliveryComments: 'Extras:\n1x Cadeira de bebé',
      }],
    })
    render(<ReservationsWorkspace canManageAccess />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const popupHeader = within(dialog).getByRole('heading', { name: 'Reserva 000123' }).closest('header')
    const imtLink = within(popupHeader).getByRole('link', { name: /Enviar mensagem IMT por WhatsApp/i })
    const url = new URL(imtLink.href)

    expect(url.origin + url.pathname).toBe('https://wa.me/')
    expect(url.searchParams.get('text')).toContain('No seu caso, como são 3 dias de aluguer')
  })

  it('keeps the core detail layout fixed when reservation data is missing', async () => {
    const user = userEvent.setup()
    fetchReservations.mockResolvedValue({
      ...payload,
      reservations: [{ id: '11190', reference: '000123', customer: 'Maria Silva', status: 'confirmed' }],
    })
    render(<ReservationsWorkspace />)

    await user.click(await screen.findByRole('button', { name: /Abrir reserva de Maria Silva/i }))

    const dialog = screen.getByRole('dialog', { name: /Reserva 000123/i })
    const content = dialog.querySelector('.reservation-details-content')
    expect(Array.from(content.children, (section) => section.querySelector('h3')?.textContent)).toEqual([
      'Cliente',
      'Condutor',
      'Percurso',
      'Viatura',
      'Comercial',
      'Extras',
      'Notas',
      'Reserva',
    ])

    const vehicleSection = within(dialog).getByRole('heading', { name: 'Viatura' }).closest('section')
    expect(Array.from(vehicleSection.querySelectorAll('dt'), (element) => element.textContent)).toEqual([
      'Modelo',
      'Matrícula',
      'Grupo',
    ])
    expect(within(vehicleSection).getAllByText('—')).toHaveLength(3)
    expect(within(dialog).getByText('Sem extras')).toBeInTheDocument()
    expect(within(dialog).getByText('Sem notas')).toBeInTheDocument()
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

  it('debounces search and filters by selected status', async () => {
    const user = userEvent.setup()
    render(<ReservationsWorkspace />)
    await screen.findByText('Maria Silva')

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar reservas' }), 'Maria')
    await user.selectOptions(screen.getByLabelText('Estado'), 'cancelled')

    await waitFor(() => {
      expect(fetchReservations).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        pickupFrom: '',
        pickupTo: '',
        q: 'Maria',
        status: ['cancelled'],
      })
    })
  })

  it('filters reservations by pickup date range and can clear the date range', async () => {
    const user = userEvent.setup()
    render(<ReservationsWorkspace />)
    await screen.findByText('Maria Silva')

    await user.type(screen.getByLabelText('Entrega de'), '2026-07-01')
    await user.type(screen.getByLabelText('Entrega até'), '2026-07-05')

    await waitFor(() => {
      expect(fetchReservations).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        pickupFrom: '2026-07-01',
        pickupTo: '2026-07-05',
        q: '',
        status: [],
      })
    })

    await user.click(screen.getByRole('button', { name: 'Limpar intervalo de entrega' }))

    await waitFor(() => {
      expect(fetchReservations).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        pickupFrom: '',
        pickupTo: '',
        q: '',
        status: [],
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
      expect(fetchReservations).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 10,
        pickupFrom: '',
        pickupTo: '',
        q: '',
        status: [],
      })
    })
  })

  it('provides responsive, focused, reduced-motion-safe visual feedback', () => {
    expect(appCss).toMatch(/\.reservation-item:focus-visible\s*{[^}]*outline:/s)
    expect(appCss).toMatch(/\.reservation-item-skeleton\s*{[^}]*animation:/s)
    expect(appCss).toMatch(/\.reservation-details-backdrop\s*{[^}]*position:\s*fixed/s)
    expect(appCss).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.reservation-item\s*{/)
    expect(appCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.reservation-item-skeleton/)
    expect(appCss).toMatch(/\.reservations-filter-row\s*{[^}]*grid-column:\s*1/s)
    expect(appCss).toMatch(/\.reservations-status-select\s*{[^}]*min-height:\s*2rem/s)
    expect(appCss).toMatch(/\.reservations-pager\s*{[^}]*grid-column:\s*2/s)
    expect(appCss).toMatch(/\.reservations-date-filter\s*{[^}]*display:\s*inline-flex/s)
    expect(appCss).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.reservations-toolbar\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(appCss).toMatch(/\.reservation-details-group h3\s*{[^}]*font-family:\s*'Sora'[^}]*font-weight:\s*900/s)
    expect(appCss).toMatch(/\.reservation-plate\s*{[^}]*overflow-wrap:\s*anywhere/s)
  })
})
