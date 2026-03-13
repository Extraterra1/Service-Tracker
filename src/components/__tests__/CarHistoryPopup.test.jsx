import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CarHistoryPopup from '../CarHistoryPopup';
import { getTodayDate } from '../../lib/date';

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
          date: getTodayDate(),
          serviceType: 'pickup',
          clientName: 'Maria Da Silva',
          reservationId: 'RES-001',
          effectiveTime: '09:30',
          location: 'Hotel Pestana'
        }
      ],
      BB11BB: [
        {
          id: 'entry-2',
          date: '2026-03-08',
          serviceType: 'return',
          clientName: 'Joao Sousa',
          reservationId: 'RET-200',
          effectiveTime: '08:15',
          location: 'Aeroporto da Madeira'
        }
      ]
    },
    rangeStart: '2026-02-26',
    rangeEnd: '2026-03-28',
    onApplyDateRange: vi.fn(),
    onClose: vi.fn(),
    ...overrides
  };
}

describe('CarHistoryPopup', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading state', () => {
    render(<CarHistoryPopup {...createProps({ loading: true })} />);

    expect(screen.getByText('A carregar histórico...')).toBeInTheDocument();
    expect(screen.getByTestId('car-history-loading-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Sem histórico de viaturas para esta janela.')).not.toBeInTheDocument();
  });

  it('shows an empty state when no plates are available', () => {
    render(<CarHistoryPopup {...createProps({ plateOptions: [], entriesByPlate: {} })} />);

    expect(screen.getByText('Sem histórico de viaturas para esta janela.')).toBeInTheDocument();
  });

  it('starts without a selected plate and only shows rows after a plate is chosen', async () => {
    const user = userEvent.setup();
    render(<CarHistoryPopup {...createProps()} />);

    expect(screen.getByText('Janela do histórico')).toBeInTheDocument();
    expect(screen.getByLabelText('Data inicial')).toHaveValue('2026-02-26');
    expect(screen.getByLabelText('Data final')).toHaveValue('2026-03-28');
    expect(screen.getByRole('heading', { name: 'Selecionar matrícula' })).toBeInTheDocument();
    expect(screen.getByText('Pesquisa uma matrícula para ver o histórico.')).toBeInTheDocument();
    expect(screen.queryByText('2026-03-10')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Selecionar matrícula' }));
    await user.click(screen.getByRole('option', { name: 'BB-11-BB' }));

    expect(screen.getByText('2026-03-08')).toBeInTheDocument();
    expect(screen.getByText('Recolha')).toBeInTheDocument();
    expect(screen.getByText('Joao Sousa')).toBeInTheDocument();
    expect(screen.getByText('RET-200')).toBeInTheDocument();
    expect(screen.getByText('08:15')).toBeInTheDocument();
    expect(screen.getByText('Aeroporto da Madeira')).toBeInTheDocument();
  });

  it('shows a "Hoje" pill for rows that match today', async () => {
    const user = userEvent.setup();
    render(<CarHistoryPopup {...createProps()} />);

    await user.click(screen.getByRole('combobox', { name: 'Selecionar matrícula' }));
    await user.click(screen.getByRole('option', { name: 'AA-00-AA' }));

    expect(screen.getByText('Hoje')).toBeInTheDocument();
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

  it('preselects the plate from initialPlateKey when provided', async () => {
    const todayDate = getTodayDate();

    render(<CarHistoryPopup {...createProps({ initialPlateKey: 'AA00AA' })} />);

    expect(screen.getByRole('heading', { name: 'AA-00-AA' })).toBeInTheDocument();
    expect(screen.getByText(todayDate)).toBeInTheDocument();
    expect(screen.queryByText('Pesquisa uma matrícula para ver o histórico.')).not.toBeInTheDocument();
  });

  it('refetches automatically when the date window changes', async () => {
    vi.useFakeTimers();
    const onApplyDateRange = vi.fn();

    render(<CarHistoryPopup {...createProps({ onApplyDateRange })} />);

    const startInput = screen.getByLabelText('Data inicial');
    const endInput = screen.getByLabelText('Data final');

    expect(startInput).toHaveValue('2026-02-26');
    expect(endInput).toHaveValue('2026-03-28');
    expect(screen.queryByRole('button', { name: 'Atualizar janela' })).not.toBeInTheDocument();

    fireEvent.change(startInput, { target: { value: '2026-03-01' } });
    fireEvent.change(endInput, { target: { value: '2026-03-12' } });
    vi.advanceTimersByTime(260);

    expect(onApplyDateRange).toHaveBeenCalledWith({
      rangeStart: '2026-03-01',
      rangeEnd: '2026-03-12'
    });
    expect(onApplyDateRange).toHaveBeenCalledTimes(1);
  });
});
