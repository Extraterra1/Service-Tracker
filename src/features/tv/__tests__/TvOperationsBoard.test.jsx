import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TvOperationsBoard from '../TvOperationsBoard'

const delivery = {
  itemId: 'delivery-1', serviceType: 'pickup', time: '12:00', name: 'Maria Silva',
  location: 'Aeroporto', car: 'VW T-Roc', plate: 'AA-00-AA', id: 'R-101', flightNumber: 'TP1685',
}
const nextDelivery = {
  itemId: 'delivery-2', serviceType: 'pickup', time: '14:00', name: 'Pedro Sousa',
  location: 'Aeroporto', car: 'Renault Clio', plate: 'DD-33-DD', id: 'R-404', flightNumber: 'U27654',
}
const recolha = {
  itemId: 'return-1', serviceType: 'return', time: '13:30', name: 'João Costa',
  location: 'Hotel Savoy', car: 'Fiat 500', plate: 'BB-11-BB', id: 'R-202',
}
const nextRecolha = {
  itemId: 'return-2', serviceType: 'return', time: '15:10', name: 'Ana Martins',
  location: 'Câmara de Lobos', car: 'Peugeot 208', plate: 'CC-22-CC', id: 'R-303',
}
const dirtyReturn = {
  itemId: 'return-dirty', serviceType: 'return', time: '09:00', name: 'Cliente',
  location: 'Aeroporto da Madeira', car: 'Seat Ibiza (A)', plate: 'BR-17-EA', id: 'R-505',
}

describe('TvOperationsBoard', () => {
  it('features the next delivery with live flight time and the next recolha with reservation time', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [nextDelivery, delivery], returns: [nextRecolha, recolha] }}
        statusMap={{}}
        flightResults={[
          { flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:42', status: 'estimated' },
          { flightNumber: 'U27654', arrivalTimeLocal: '2026-07-21T13:15', status: 'scheduled' },
        ]}
      />,
    )

    const deliveryPanel = screen.getByRole('region', { name: 'Próxima entrega' })
    const recolhaPanel = screen.getByRole('region', { name: 'Próxima recolha' })
    const nextRecolhaPanel = screen.getByRole('complementary', { name: 'Recolha a seguir' })
    const nextDeliveryPanel = screen.getByRole('complementary', { name: 'Entrega a seguir' })
    expect(screen.getByRole('img', { name: 'JustDrive Madeira Rent-A-Car' })).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('10:42')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('Hora do voo')).toHaveClass('is-flight')
    expect(within(deliveryPanel).getByText('MARIA SILVA')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('TP1685')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('AA-00-AA')).toBeInTheDocument()
    expect(within(nextDeliveryPanel).getByText('A seguir')).toBeInTheDocument()
    expect(within(nextDeliveryPanel).getByText('13:15')).toBeInTheDocument()
    expect(within(nextDeliveryPanel).getByText('PEDRO SOUSA')).toBeInTheDocument()
    expect(within(nextDeliveryPanel).getByText('Aeroporto')).toBeInTheDocument()
    expect(within(nextDeliveryPanel).getByText('DD-33-DD')).toBeInTheDocument()
    expect(within(nextDeliveryPanel).queryByText('Renault Clio')).not.toBeInTheDocument()
    expect(within(nextDeliveryPanel).queryByText('#R-404')).not.toBeInTheDocument()
    expect(within(recolhaPanel).getByText('13:30')).toBeInTheDocument()
    expect(within(recolhaPanel).getByText('JOÃO COSTA')).toBeInTheDocument()
    expect(within(nextRecolhaPanel).getByText('A seguir')).toBeInTheDocument()
    expect(within(nextRecolhaPanel).getByText('15:10')).toBeInTheDocument()
    expect(within(nextRecolhaPanel).getByText('ANA MARTINS')).toBeInTheDocument()
    expect(within(nextRecolhaPanel).getByText('Câmara de Lobos')).toBeInTheDocument()
    expect(within(nextRecolhaPanel).getByText('CC-22-CC')).toBeInTheDocument()
    expect(within(nextRecolhaPanel).queryByText('Peugeot 208')).not.toBeInTheDocument()
    expect(within(nextRecolhaPanel).queryByText('#R-303')).not.toBeInTheDocument()
  })

  it('leaves the secondary recolha space blank when only one is pending', () => {
    render(<TvOperationsBoard serviceData={{ pickups: [], returns: [recolha] }} statusMap={{}} />)
    expect(screen.queryByRole('complementary', { name: 'Recolha a seguir' })).not.toBeInTheDocument()
  })

  it('leaves the secondary delivery space blank when only one is pending', () => {
    render(<TvOperationsBoard serviceData={{ pickups: [delivery], returns: [] }} statusMap={{}} />)
    expect(screen.queryByRole('complementary', { name: 'Entrega a seguir' })).not.toBeInTheDocument()
  })

  it('scrolls completed airport or office cars that are awaiting transfer', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [delivery], returns: [dirtyReturn] }}
        statusMap={{ 'return-dirty': { done: true } }}
        transferMap={{ 'return-dirty': { transferred: false } }}
      />,
    )

    const ticker = screen.getByRole('region', { name: 'Sujos em baixo' })
    expect(within(ticker).getByText('Sujos em baixo')).toBeInTheDocument()
    expect(within(ticker).getAllByText('Seat Ibiza (A) BR-17-EA')).toHaveLength(1)
  })

  it('removes a car from the ticker as soon as it is marked transferred', () => {
    const props = {
      serviceData: { pickups: [delivery], returns: [dirtyReturn] },
      statusMap: { 'return-dirty': { done: true } },
    }
    const { rerender } = render(
      <TvOperationsBoard {...props} transferMap={{ 'return-dirty': { transferred: false } }} />,
    )
    expect(screen.getByRole('region', { name: 'Sujos em baixo' })).toBeInTheDocument()

    rerender(<TvOperationsBoard {...props} transferMap={{ 'return-dirty': { transferred: true } }} />)
    expect(screen.queryByRole('region', { name: 'Sujos em baixo' })).not.toBeInTheDocument()
  })

  it('does not include unfinished or non-transfer-location recolhas', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [delivery], returns: [
          { ...dirtyReturn, itemId: 'unfinished' },
          { ...dirtyReturn, itemId: 'hotel', location: 'Hotel Savoy' },
        ] }}
        statusMap={{ unfinished: { done: false }, hotel: { done: true } }}
        transferMap={{ unfinished: { transferred: false }, hotel: { transferred: false } }}
      />,
    )
    expect(screen.queryByRole('region', { name: 'Sujos em baixo' })).not.toBeInTheDocument()
  })

  it('makes the earliest live flight the primary delivery even when its reservation is later', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [delivery, nextDelivery], returns: [] }}
        statusMap={{}}
        flightResults={[
          { flightNumber: 'TP1685', arrivalTimeLocal: '2026-08-05T13:22', status: 'estimated' },
          { flightNumber: 'U27654', arrivalTimeLocal: '2026-08-05T13:12', status: 'estimated' },
        ]}
      />,
    )

    const deliveryPanel = screen.getByRole('region', { name: 'Próxima entrega' })
    expect(within(deliveryPanel).getByRole('heading', { level: 2 })).toHaveTextContent('PEDRO SOUSA')
    expect(within(deliveryPanel).getByText('13:12')).toHaveClass('tv-board-time')
    expect(within(screen.getByRole('complementary', { name: 'Entrega a seguir' })).getByText('13:22')).toBeInTheDocument()
  })

  it('falls back to the delivery reservation time when there is no flight result', () => {
    render(<TvOperationsBoard serviceData={{ pickups: [{ ...delivery, overrideTime: '12:20' }], returns: [] }} statusMap={{}} />)
    const deliveryPanel = screen.getByRole('region', { name: 'Próxima entrega' })
    expect(within(deliveryPanel).getByText('12:20')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('Hora da reserva')).not.toHaveClass('is-flight')
  })

  it('makes a landed flight unmistakable without duplicating its status in metadata', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [delivery], returns: [] }}
        statusMap={{}}
        flightResults={[{ flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:42', status: 'arrived' }]}
      />,
    )

    const deliveryPanel = screen.getByRole('region', { name: 'Próxima entrega' })
    expect(deliveryPanel).toHaveClass('is-landed')
    expect(within(deliveryPanel).getByRole('status')).toHaveTextContent('✓ ATERROU')
    expect(within(deliveryPanel).queryByText('Estado')).not.toBeInTheDocument()
  })

  it('does not show the landed treatment for other flight states', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [delivery], returns: [] }}
        statusMap={{}}
        flightResults={[{ flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:42', status: 'estimated' }]}
      />,
    )

    const deliveryPanel = screen.getByRole('region', { name: 'Próxima entrega' })
    expect(deliveryPanel).not.toHaveClass('is-landed')
    expect(within(deliveryPanel).queryByText('✓ ATERROU')).not.toBeInTheDocument()
    expect(within(deliveryPanel).getByText('Estimado')).toBeInTheDocument()
  })

  it('shows stable section-specific empty states', () => {
    render(<TvOperationsBoard serviceData={{ pickups: [], returns: [] }} statusMap={{}} />)
    expect(screen.getByText('Sem entregas pendentes')).toBeInTheDocument()
    expect(screen.getByText('Sem recolhas pendentes')).toBeInTheDocument()
    expect(screen.getByText('Próxima entrega')).toBeInTheDocument()
    expect(screen.getByText('Próxima recolha')).toBeInTheDocument()
    expect(screen.queryByText('01')).not.toBeInTheDocument()
    expect(screen.queryByText('02')).not.toBeInTheDocument()
  })

  it('shows a board loading state', () => {
    render(<TvOperationsBoard loading serviceData={{ pickups: [], returns: [] }} statusMap={{}} />)
    expect(screen.getByText('A preparar o próximo serviço')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'JustDrive Madeira Rent-A-Car' })).toBeInTheDocument()
  })
})
