import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActivityPopup from '../ActivityPopup';

function renderPopup(activityEntries) {
  render(
    <ActivityPopup
      selectedDate="2026-03-06"
      loadingActivity={false}
      activityEntries={activityEntries}
      plateByItemId={{
        itemStatus: 'AA-00-AA',
        itemTime: 'CC-22-CC',
      }}
      activityTimeFormatter={{ format: () => '06/03 11:22' }}
      onClose={vi.fn()}
    />,
  );
}

describe('ActivityPopup', () => {
  it('shows the plate and omits reservation numbers for all activity entry types', () => {
    renderPopup([
      {
        id: 'entry-status',
        actionType: 'status_toggle',
        itemId: 'itemStatus',
        done: true,
        serviceType: 'delivery',
        itemName: 'Servico 1',
        reservationId: 'RES-001',
        plate: '',
        itemTime: '09:00',
        createdAt: '2026-03-06T11:22:00.000Z',
        updatedByName: 'Maria',
      },
      {
        id: 'entry-ready',
        actionType: 'ready_toggle',
        ready: true,
        serviceType: 'return',
        itemName: 'Servico 2',
        reservationId: 'RES-002',
        plate: 'BB-11-BB',
        itemTime: '10:00',
        createdAt: '2026-03-06T11:22:00.000Z',
        updatedByName: 'Joao',
      },
      {
        id: 'entry-time',
        actionType: 'time_change',
        itemId: 'itemTime',
        serviceType: 'delivery',
        itemName: 'Servico 3',
        reservationId: 'RES-003',
        plate: '',
        oldTime: '11:00',
        newTime: '11:30',
        createdAt: '2026-03-06T11:22:00.000Z',
        updatedByName: 'Ana',
      },
    ]);

    expect(screen.getByText('Servico 1 · AA-00-AA · 09:00 · 06/03 11:22')).toBeInTheDocument();
    expect(screen.getByText('Servico 2 · BB-11-BB · 06/03 11:22')).toBeInTheDocument();
    expect(screen.getByText('Servico 3 · CC-22-CC · 11:00 → 11:30 · 06/03 11:22')).toBeInTheDocument();
    expect(screen.queryByText(/RES-001|RES-002|RES-003/)).not.toBeInTheDocument();
  });
});
