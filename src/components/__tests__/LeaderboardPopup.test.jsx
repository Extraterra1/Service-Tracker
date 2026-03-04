import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LeaderboardPopup from '../LeaderboardPopup';

function createRows() {
  return [
    { key: 'u1', rank: 1, score: 12, displayName: 'Carlos', email: 'carlos@example.com', photoURL: '' },
    { key: 'u2', rank: 2, score: 10, displayName: 'Ana', email: 'ana@example.com', photoURL: '' },
    { key: 'u3', rank: 3, score: 8, displayName: 'Joao', email: 'joao@example.com', photoURL: '' },
    { key: 'u4', rank: 4, score: 6, displayName: 'Marta', email: 'marta@example.com', photoURL: '' },
  ];
}

function renderPopup(overrides = {}) {
  const props = {
    period: 'weekly',
    data: {
      rows: createRows(),
      totalActions: 36,
      participants: 4,
      capped: false,
    },
    lastLoadedAt: new Date('2026-03-02T15:00:00.000Z'),
    loading: false,
    errorMessage: '',
    onClose: vi.fn(),
    onPeriodChange: vi.fn(),
    ...overrides,
  };

  render(<LeaderboardPopup {...props} />);
  return props;
}

describe('LeaderboardPopup', () => {
  it('renders loading state', () => {
    renderPopup({ loading: true });
    expect(screen.getByText('A calcular leaderboard...')).toBeInTheDocument();
  });

  it('renders podium and remaining ranked list', () => {
    renderPopup();

    expect(screen.getByRole('heading', { name: 'Ações da Equipa' })).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Joao')).toBeInTheDocument();
    expect(screen.getByText('Marta')).toBeInTheDocument();
    expect(screen.getByText(/4 participantes · 36 ações/)).toBeInTheDocument();
  });

  it('triggers period selection callback', async () => {
    const user = userEvent.setup();
    const { onPeriodChange } = renderPopup({ period: 'weekly' });

    await user.click(screen.getByRole('tab', { name: 'Mês' }));

    expect(onPeriodChange).toHaveBeenCalledWith('monthly');
  });

  it('renders empty and error states', () => {
    renderPopup({
      data: {
        rows: [],
        totalActions: 0,
        participants: 0,
        capped: false,
      },
      errorMessage: 'Falha a carregar',
    });

    expect(screen.getByText('Falha a carregar')).toBeInTheDocument();
    expect(screen.getByText('Sem ações para este período.')).toBeInTheDocument();
  });
});
