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
    periodWindowLabel: '03/03/2026 - 09/03/2026',
    canNavigateForward: true,
    onNavigatePeriod: vi.fn(),
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

  it('keeps current rows visible while loading a new period and shows loading overlay', () => {
    renderPopup({ loading: true });

    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('A calcular leaderboard...')).toBeInTheDocument();
    expect(document.querySelector('.leaderboard-loading-overlay')).toBeInTheDocument();
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

  it('formats displayed names in title case', () => {
    render(
      <LeaderboardPopup
        period="weekly"
        data={{
          rows: [
            { key: 'u1', rank: 1, score: 12, displayName: 'maria silva', email: 'maria@example.com', photoURL: '' },
            { key: 'u2', rank: 2, score: 10, displayName: 'joao sOuZa', email: 'joao@example.com', photoURL: '' },
          ],
          totalActions: 22,
          participants: 2,
          capped: false,
        }}
        lastLoadedAt={new Date('2026-03-02T15:00:00.000Z')}
        loading={false}
        errorMessage=""
        onClose={vi.fn()}
        onPeriodChange={vi.fn()}
      />
    );

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Joao Souza')).toBeInTheDocument();
  });

  it('triggers period selection callback', async () => {
    const user = userEvent.setup();
    const { onPeriodChange } = renderPopup({ period: 'weekly' });

    await user.click(screen.getByRole('tab', { name: 'Mês' }));

    expect(onPeriodChange).toHaveBeenCalledWith('monthly');
  });

  it('renders history navigation for weekly and monthly periods', () => {
    renderPopup({
      period: 'weekly',
      periodWindowLabel: '03/03/2026 - 09/03/2026',
    });

    expect(screen.getByRole('button', { name: 'Período anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo período' })).toBeInTheDocument();
    expect(screen.getByText('03/03/2026 - 09/03/2026')).toBeInTheDocument();
  });

  it('does not render history navigation for all-time', () => {
    renderPopup({
      period: 'all_time',
      periodWindowLabel: 'Todos os registos',
    });

    expect(screen.queryByRole('button', { name: 'Período anterior' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximo período' })).not.toBeInTheDocument();
  });

  it('triggers period history navigation callbacks', async () => {
    const user = userEvent.setup();
    const { onNavigatePeriod } = renderPopup({
      period: 'monthly',
      periodWindowLabel: 'março 2026',
    });

    await user.click(screen.getByRole('button', { name: 'Período anterior' }));
    await user.click(screen.getByRole('button', { name: 'Próximo período' }));

    expect(onNavigatePeriod).toHaveBeenCalledWith('previous');
    expect(onNavigatePeriod).toHaveBeenCalledWith('next');
  });

  it('disables forward navigation when the current period is already selected', () => {
    renderPopup({
      period: 'weekly',
      canNavigateForward: false,
    });

    expect(screen.getByRole('button', { name: 'Próximo período' })).toBeDisabled();
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
