import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ServiceWorkspace from '../ServiceWorkspace';

describe('ServiceWorkspace', () => {
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

    expect(
      screen.getByText((_, element) => element?.classList.contains('item-footer') && element.textContent?.includes('Atualizado por Cristina'))
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Cristina venceu a semana passada')).toHaveTextContent('Cristina');
    expect(screen.queryByText('VENCEU A SEMANA PASSADA')).not.toBeInTheDocument();
  });
});
