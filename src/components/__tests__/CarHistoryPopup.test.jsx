import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CarHistoryPopup from '../CarHistoryPopup';

function createProps(overrides = {}) {
  return {
    loading: false,
    error: '',
    plateOptions: [
      { value: 'AA00AA', label: 'AA-00-AA' },
      { value: 'BB11BB', label: 'BB-11-BB' }
    ],
    entriesByPlate: {
      AA00AA: [
        {
          id: 'entry-1',
          date: '2026-03-10',
          serviceType: 'pickup',
          clientName: 'Maria',
          reservationId: 'RES-001',
          effectiveTime: '09:30'
        }
      ],
      BB11BB: [
        {
          id: 'entry-2',
          date: '2026-03-08',
          serviceType: 'return',
          clientName: 'Joao',
          reservationId: 'RET-200',
          effectiveTime: '08:15'
        }
      ]
    },
    rangeStart: '2026-02-26',
    rangeEnd: '2026-03-28',
    onClose: vi.fn(),
    ...overrides
  };
}

describe('CarHistoryPopup', () => {
  it('shows a loading state', () => {
    render(<CarHistoryPopup {...createProps({ loading: true })} />);

    expect(screen.getByText('A carregar histórico...')).toBeInTheDocument();
  });

  it('shows an empty state when no plates are available', () => {
    render(<CarHistoryPopup {...createProps({ plateOptions: [], entriesByPlate: {} })} />);

    expect(screen.getByText('Sem histórico de viaturas para esta janela.')).toBeInTheDocument();
  });

  it('starts without a selected plate and only shows rows after a plate is chosen', async () => {
    const user = userEvent.setup();
    render(<CarHistoryPopup {...createProps()} />);

    expect(screen.getByText('Janela: 2026-02-26 a 2026-03-28')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selecionar matrícula' })).toBeInTheDocument();
    expect(screen.getByText('Pesquisa uma matrícula para ver o histórico.')).toBeInTheDocument();
    expect(screen.queryByText('2026-03-10')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Selecionar matrícula' }));
    await user.click(screen.getByRole('option', { name: 'BB-11-BB' }));

    expect(screen.getByText('2026-03-08')).toBeInTheDocument();
    expect(screen.getByText('Recolha')).toBeInTheDocument();
    expect(screen.getByText('Joao')).toBeInTheDocument();
    expect(screen.getByText('RET-200')).toBeInTheDocument();
    expect(screen.getByText('08:15')).toBeInTheDocument();
  });

  it('supports fuzzy searching plates before selecting another history list', async () => {
    const user = userEvent.setup();
    render(<CarHistoryPopup {...createProps()} />);

    const input = screen.getByRole('combobox', { name: 'Selecionar matrícula' });

    await user.type(input, 'b1b');

    expect(screen.getByRole('option', { name: 'BB-11-BB' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'AA-00-AA' })).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByRole('heading', { name: 'BB-11-BB' })).toBeInTheDocument();
    expect(screen.getByText('2026-03-08')).toBeInTheDocument();
    expect(screen.getByText('Recolha')).toBeInTheDocument();
  });
});
