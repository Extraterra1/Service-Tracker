import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAndCacheReservation } from '../../../lib/reservationDetailsCache';
import ServiceWorkspace from '../ServiceWorkspace';

const { fetchReservationDetails, prefetchReservationDetails } = vi.hoisted(() => ({
  fetchReservationDetails: vi.fn(),
  prefetchReservationDetails: vi.fn()
}));
vi.mock('../../../lib/reservationsApi', () => ({ fetchReservationDetails }));
vi.mock('../../../lib/reservationDetailsCache', async (importOriginal) => ({
  ...await importOriginal(),
  prefetchReservationDetails
}));

describe('ServiceWorkspace', () => {
  beforeEach(() => {
    fetchReservationDetails.mockReset();
    prefetchReservationDetails.mockReset();
    prefetchReservationDetails.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not install a recurring idle interval', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    render(
      <ServiceWorkspace
        serviceData={{ pickups: [], returns: [] }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('prefetches unique reservation details when service items become available', async () => {
    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [
            { itemId: 'pickup-prefetch-1', id: '00123', serviceType: 'pickup' },
            { itemId: 'pickup-prefetch-2', id: '123', serviceType: 'pickup' }
          ],
          returns: [
            { itemId: 'return-prefetch-1', id: '00200', serviceType: 'return' },
            { itemId: 'return-prefetch-empty', id: '  ', serviceType: 'return' }
          ]
        }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    await waitFor(() => {
      expect(prefetchReservationDetails).toHaveBeenCalledTimes(1);
    });
    expect(prefetchReservationDetails).toHaveBeenCalledWith(['00123', '00200']);
  });

  it('loads full reservation details when a service reservation number is clicked', async () => {
    const user = userEvent.setup();
    let resolveDetails;
    fetchReservationDetails.mockReturnValue(new Promise((resolve) => { resolveDetails = resolve; }));

    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [{
            itemId: 'pickup-1', serviceType: 'pickup', time: '09:00', name: 'Maria', id: '10787',
            reservationUrl: 'https://reservations.justdrivemadeira.com/legacy', phone: '', car: 'Fiat Panda',
            plate: 'AA-00-AA', location: 'AEROPORTO DA MADEIRA', extras: [], notes: ''
          }],
          returns: []
        }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ver detalhes da reserva 10787' }));
    expect(fetchReservationDetails).toHaveBeenCalledWith('10787');
    expect(screen.getByRole('dialog', { name: 'A carregar reserva 10787' })).toBeInTheDocument();

    resolveDetails({ id: '11190', reference: '010787', customer: 'Maria', status: 'confirmed' });

    expect(await screen.findByRole('dialog', { name: 'Reserva 010787' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver no Reservations' })).toHaveAttribute('href', expect.stringContaining('id=11190'));
  });

  it('offers a retry when reservation details fail to load', async () => {
    const user = userEvent.setup();
    fetchReservationDetails
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: '11190', reference: '010787', customer: 'Maria' });

    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [{
            itemId: 'pickup-1', serviceType: 'pickup', time: '09:00', name: 'Maria', id: '20787',
            phone: '', car: 'Fiat Panda', plate: 'AA-00-AA', location: 'AEROPORTO DA MADEIRA', extras: [], notes: ''
          }],
          returns: []
        }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ver detalhes da reserva 20787' }));
    expect(await screen.findByText('Não foi possível carregar a reserva.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('dialog', { name: 'Reserva 010787' })).toBeInTheDocument();
    expect(fetchReservationDetails).toHaveBeenCalledTimes(2);
  });

  it('shows cached details immediately and refreshes them in the background', async () => {
    const user = userEvent.setup();
    fetchReservationDetails.mockResolvedValueOnce({ id: '41190', reference: '040787', customer: 'Cached Maria' });
    await fetchAndCacheReservation('40787');
    let resolveRefresh;
    fetchReservationDetails.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve; }));

    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [{
            itemId: 'pickup-stale-cache', serviceType: 'pickup', time: '09:00', name: 'Maria', id: '40787',
            phone: '', car: 'Fiat Panda', plate: 'AA-00-AA', location: 'AEROPORTO DA MADEIRA', extras: [], notes: ''
          }],
          returns: []
        }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ver detalhes da reserva 40787' }));

    expect(screen.getByRole('dialog', { name: 'Reserva 040787' })).toBeInTheDocument();
    expect(screen.getByText('Cached Maria')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('A atualizar…');

    resolveRefresh({ id: '41190', reference: '040787', customer: 'Fresh Maria' });

    expect(await screen.findByText('Fresh Maria')).toBeInTheDocument();
    expect(screen.queryByText('Cached Maria')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps cached details visible when a background refresh fails', async () => {
    const user = userEvent.setup();
    fetchReservationDetails.mockResolvedValueOnce({ id: '51190', reference: '050787', customer: 'Cached Ana' });
    await fetchAndCacheReservation('50787');
    fetchReservationDetails.mockRejectedValueOnce(new Error('offline'));

    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [{
            itemId: 'pickup-refresh-failure', serviceType: 'pickup', time: '09:00', name: 'Ana', id: '50787',
            phone: '', car: 'Fiat Panda', plate: 'AA-00-AA', location: 'AEROPORTO DA MADEIRA', extras: [], notes: ''
          }],
          returns: []
        }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ver detalhes da reserva 50787' }));

    expect(screen.getByRole('dialog', { name: 'Reserva 050787' })).toBeInTheDocument();
    expect(screen.getByText('Cached Ana')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByText('Não foi possível carregar a reserva.')).not.toBeInTheDocument();
  });

  it('refreshes reservation details after the popup is closed and reopened', async () => {
    const user = userEvent.setup();
    fetchReservationDetails.mockResolvedValue({ id: '31190', reference: '030787', customer: 'Maria' });

    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [{
            itemId: 'pickup-cache', serviceType: 'pickup', time: '09:00', name: 'Maria', id: '30787',
            phone: '', car: 'Fiat Panda', plate: 'AA-00-AA', location: 'AEROPORTO DA MADEIRA', extras: [], notes: ''
          }],
          returns: []
        }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    const reservationButton = screen.getByRole('button', { name: 'Ver detalhes da reserva 30787' });
    await user.click(reservationButton);
    expect(await screen.findByRole('dialog', { name: 'Reserva 030787' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar detalhes da reserva' }));
    await user.click(reservationButton);

    expect(screen.getByRole('dialog', { name: 'Reserva 030787' })).toBeInTheDocument();
    expect(fetchReservationDetails).toHaveBeenCalledTimes(2);
  });

  it('shows a completed shared-plate marker on entrega cards when the paired recolha is done', () => {
    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [
            {
              itemId: 'pickup-1',
              serviceType: 'pickup',
              time: '09:00',
              name: 'Carlos',
              id: '0001',
              phone: '',
              car: 'Fiat Panda',
              plate: 'AA-00-AA',
              location: 'AEROPORTO DA MADEIRA',
              extras: [],
              notes: ''
            }
          ],
          returns: [
            {
              itemId: 'return-1',
              serviceType: 'return',
              time: '18:00',
              name: 'Carlos',
              id: '0002',
              phone: '',
              car: 'Fiat Panda',
              plate: 'AA-00-AA',
              location: 'Funchal',
              extras: [],
              notes: ''
            }
          ]
        }}
        statusMap={{
          'return-1': {
            done: true
          }
        }}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        onSharedPlateTap={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    expect(
      screen.getByRole('button', { name: 'Viatura com entrega e recolha nesta data; recolha concluída' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Viatura com entrega e recolha nesta data' })).toBeInTheDocument();
  });

  it('shows a medal next to the updater when they won last week leaderboard', () => {
    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [
            {
              itemId: 'pickup-1',
              serviceType: 'pickup',
              time: '09:00',
              name: 'Cristina',
              id: '0001',
              phone: '',
              car: 'Fiat Panda',
              plate: 'AA-00-AA',
              location: 'AEROPORTO DA MADEIRA',
              extras: [],
              notes: ''
            }
          ],
          returns: []
        }}
        statusMap={{
          'pickup-1': {
            done: false,
            updatedAt: new Date('2026-03-20T09:15:00.000Z'),
            updatedByUid: 'uid-cristina',
            updatedByName: 'Cristina',
            updatedByEmail: 'cristina@example.com'
          }
        }}
        readyMap={{}}
        lastWeekWinnerKeys={new Set(['uid:uid-cristina', 'uid:uid-ana'])}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        onSharedPlateTap={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    const footer = document.querySelector('.item-footer');
    expect(footer?.querySelector('.item-footer-lead')?.textContent).toBe('Atualizado por');
    expect(screen.getByLabelText('Cristina venceu a semana passada')).toHaveTextContent('Cristina');
    expect(footer?.querySelector('.item-footer-time')?.textContent).toBe('às 09:15');
    expect(screen.queryByText('VENCEU A SEMANA PASSADA')).not.toBeInTheDocument();
  });

  it('passes transfer state and toggle behavior to completed recolhas', async () => {
    const onToggleTransferred = vi.fn();
    render(
      <ServiceWorkspace
        serviceData={{ pickups: [], returns: [{ itemId: 'return-1', serviceType: 'return', time: '18:00', name: 'Carlos', id: '0002', phone: '', car: 'Fiat', plate: 'AA-00-AA', location: 'AEROPORTO DA MADEIRA', extras: [], notes: '' }] }}
        statusMap={{ 'return-1': { done: true } }}
        readyMap={{}}
        transferMap={{ 'return-1': { transferred: true } }}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onToggleTransferred={onToggleTransferred}
        onSaveTimeOverride={vi.fn()}
        disabled={false}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Marcar viatura AA-00-AA como aguardando transferência' }));
    expect(onToggleTransferred).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'return-1' }));
  });

  it('passes WhatsApp confirmation mode to service cards', () => {
    render(
      <ServiceWorkspace
        serviceData={{
          pickups: [{
            itemId: 'pickup-whatsapp', serviceType: 'pickup', time: '13:00', name: 'Carlos', id: '0003',
            phone: '+351 912 345 678', car: 'Fiat', plate: 'BB-00-BB', location: 'AEROPORTO DA MADEIRA', extras: [], notes: ''
          }],
          returns: []
        }}
        statusMap={{}}
        readyMap={{}}
        whatsappConfirmationEnabled
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        disabled={false}
      />
    );

    const link = screen.getByRole('link', { name: 'Abrir conversa no WhatsApp para +351 912 345 678' });
    expect(new URL(link.href).searchParams.get('text')).toContain('amanhã às 13:00');
  });
});
