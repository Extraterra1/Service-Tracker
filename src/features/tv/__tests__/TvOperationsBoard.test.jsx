import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TvOperationsBoard from '../TvOperationsBoard'

const delivery = {
  itemId: 'delivery-1', serviceType: 'pickup', time: '12:00', name: 'Maria Silva',
  location: 'Aeroporto', car: 'VW T-Roc', plate: 'AA-00-AA', id: 'R-101', flightNumber: 'TP1685',
}
const recolha = {
  itemId: 'return-1', serviceType: 'return', time: '13:30', name: 'João Costa',
  location: 'Hotel Savoy', car: 'Fiat 500', plate: 'BB-11-BB', id: 'R-202',
}
const nextRecolha = {
  itemId: 'return-2', serviceType: 'return', time: '15:10', name: 'Ana Martins',
  location: 'Câmara de Lobos', car: 'Peugeot 208', plate: 'CC-22-CC', id: 'R-303',
}

describe('TvOperationsBoard', () => {
  it('features the next delivery with live flight time and the next recolha with reservation time', () => {
    render(
      <TvOperationsBoard
        serviceData={{ pickups: [delivery], returns: [nextRecolha, recolha] }}
        statusMap={{}}
        flightResults={[{ flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:42', status: 'estimated' }]}
      />,
    )

    const deliveryPanel = screen.getByRole('region', { name: 'Próxima entrega' })
    const recolhaPanel = screen.getByRole('region', { name: 'Próxima recolha' })
    const nextRecolhaPanel = screen.getByRole('complementary', { name: 'Recolha a seguir' })
    expect(screen.getByRole('img', { name: 'JustDrive Madeira Rent-A-Car' })).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('10:42')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('Hora do voo')).toHaveClass('is-flight')
    expect(within(deliveryPanel).getByText('MARIA SILVA')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('TP1685')).toBeInTheDocument()
    expect(within(deliveryPanel).getByText('AA-00-AA')).toBeInTheDocument()
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
