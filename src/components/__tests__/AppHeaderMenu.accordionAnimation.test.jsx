import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AppHeaderMenu from '../AppHeaderMenu';

function createProps(overrides = {}) {
  return {
    menuPanelRef: createRef(),
    theme: 'light',
    onToggleTheme: vi.fn(),
    user: null,
    accessState: 'approved',
    checkingAccess: false,
    pin: '',
    pinSyncState: 'idle',
    onOpenAccountSection: vi.fn(),
    onPinChange: vi.fn(),
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    manualCompletedCandidates: [],
    manualCompletedItemId: '',
    onManualCompletedItemIdChange: vi.fn(),
    onAddToCompleted: vi.fn(),
    updatingItemId: '',
    allServiceItems: [],
    timeOverrideItemId: '',
    onTimeOverrideSelectionChange: vi.fn(),
    timeOverrideValue: '',
    onTimeOverrideValueChange: vi.fn(),
    hasMenuTimeOverrideInput: false,
    isMenuTimeOverrideValid: true,
    selectedTimeOverrideItem: null,
    onSaveTimeOverride: vi.fn(),
    canResetSelectedTimeOverride: false,
    onResetTimeOverride: vi.fn(),
    selectedDate: '2026-03-04',
    onOpenActivityPopup: vi.fn(),
    onOpenCarHistoryPopup: vi.fn(),
    onOpenLeaderboardPopup: vi.fn(),
    onCopySessionDiagnostics: vi.fn(),
    diagnosticsStatusMessage: '',
    leaderboardLoading: false,
    statusLine: 'ok',
    canMutateSelectedDate: true,
    ...overrides
  };
}

describe('AppHeaderMenu accordion animations', () => {
  it('keeps section in temporary closing state when closing', async () => {
    const user = userEvent.setup();
    render(<AppHeaderMenu {...createProps()} />);

    const completedSummary = screen.getByText('Finalizados');
    await user.click(completedSummary);

    const completedSection = completedSummary.closest('details');
    expect(completedSection).not.toBeNull();
    expect(completedSection).toHaveAttribute('open');

    await user.click(completedSummary);

    expect(completedSection).toHaveClass('is-closing');
    expect(completedSection).toHaveAttribute('open');
  });

  it('uses a native time picker in manual override section', async () => {
    const user = userEvent.setup();
    const serviceItem = {
      itemId: 'item-1',
      serviceType: 'pickup',
      name: 'Cliente Teste',
      time: '09:30',
      overrideTime: ''
    };

    render(
      <AppHeaderMenu
        {...createProps({
          allServiceItems: [serviceItem],
          timeOverrideItemId: serviceItem.itemId,
          selectedTimeOverrideItem: serviceItem,
          timeOverrideValue: '09:30',
          hasMenuTimeOverrideInput: true,
          isMenuTimeOverrideValid: true
        })}
      />
    );

    await user.click(screen.getByText('Alterar Hora'));

    const timeInput = screen.getByLabelText('Hora manual no formato 24 horas');
    expect(timeInput).toHaveAttribute('type', 'time');
  });

  it('refreshes pin sync when opening the account section', async () => {
    const user = userEvent.setup();
    const onOpenAccountSection = vi.fn();

    render(<AppHeaderMenu {...createProps({ onOpenAccountSection })} />);
    await user.click(screen.getByText('Conta e PIN'));

    expect(onOpenAccountSection).toHaveBeenCalledTimes(1);
  });

  it('opens activity popup when clicking activity section header', async () => {
    const user = userEvent.setup();
    const onOpenActivityPopup = vi.fn();

    render(<AppHeaderMenu {...createProps({ onOpenActivityPopup })} />);
    await user.click(screen.getByText('Atividade do Dia'));

    expect(onOpenActivityPopup).toHaveBeenCalled();
  });

  it('opens car history popup when clicking car history section header', async () => {
    const user = userEvent.setup();
    const onOpenCarHistoryPopup = vi.fn();

    render(<AppHeaderMenu {...createProps({ onOpenCarHistoryPopup })} />);
    await user.click(screen.getByText('Histórico de Viaturas'));

    expect(onOpenCarHistoryPopup).toHaveBeenCalled();
  });

  it('renders activity action without a live count badge', () => {
    const { container } = render(<AppHeaderMenu {...createProps()} />);

    expect(screen.getByText('Atividade do Dia')).toBeInTheDocument();
    expect(container.querySelector('.menu-section-count-pill')).toBeNull();
  });

  it('opens leaderboard popup when clicking leaderboard section header', async () => {
    const user = userEvent.setup();
    const onOpenLeaderboardPopup = vi.fn();

    render(<AppHeaderMenu {...createProps({ onOpenLeaderboardPopup })} />);
    await user.click(screen.getByText('Leaderboard'));

    expect(onOpenLeaderboardPopup).toHaveBeenCalled();
  });

  it('renders an aviability lookup link with joined arrival flights and selected date params', () => {
    render(
      <AppHeaderMenu
        {...createProps({
          selectedDate: '2026-04-15',
          allServiceItems: [
            { itemId: 'pickup-1', serviceType: 'pickup', flightNumber: 'TP123' },
            { itemId: 'pickup-2', serviceType: 'pickup', flightNumber: 'FR456' },
            { itemId: 'pickup-3', serviceType: 'pickup', flightNumber: 'TP123' },
            { itemId: 'return-1', serviceType: 'return', flightNumber: 'U27654' },
            { itemId: 'pickup-4', serviceType: 'pickup', flightNumber: '   ' }
          ]
        })}
      />
    );

    const lookupLink = screen.getByRole('link', { name: 'Aviability Lookup' });

    expect(lookupLink).toHaveAttribute('href', 'https://fncfutures.vercel.app/?flights=TP123%2CFR456&date=2026-04-15');
    expect(lookupLink).toHaveAttribute('target', '_blank');
    expect(lookupLink).toHaveAttribute('rel', 'noreferrer');
  });

  it('exposes a menu action to copy session diagnostics', async () => {
    const user = userEvent.setup();
    const onCopySessionDiagnostics = vi.fn();

    render(
      <AppHeaderMenu
        {...createProps({
          onCopySessionDiagnostics,
          diagnosticsStatusMessage: 'Diagnóstico pronto a enviar.'
        })}
      />
    );

    await user.click(screen.getByText('Conta e PIN'));

    const accountSection = screen.getByText('Conta e PIN').closest('details');
    expect(accountSection).not.toBeNull();

    const diagnosticsButton = within(accountSection).getByRole('button', { name: 'Copiar diagnóstico de sessão' });
    await user.click(diagnosticsButton);

    expect(onCopySessionDiagnostics).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Diagnóstico pronto a enviar.')).toBeInTheDocument();
  });

  it('disables manual mutation controls when selected date is not current', async () => {
    const user = userEvent.setup();
    const serviceItem = {
      itemId: 'item-1',
      serviceType: 'pickup',
      name: 'Cliente Teste',
      time: '09:30',
      overrideTime: ''
    };

    render(
      <AppHeaderMenu
        {...createProps({
          canMutateSelectedDate: false,
          manualCompletedCandidates: [serviceItem],
          manualCompletedItemId: serviceItem.itemId,
          allServiceItems: [serviceItem],
          timeOverrideItemId: serviceItem.itemId,
          selectedTimeOverrideItem: serviceItem,
          timeOverrideValue: '09:30',
          hasMenuTimeOverrideInput: true,
          isMenuTimeOverrideValid: true
        })}
      />
    );

    await user.click(screen.getByText('Finalizados'));
    expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();

    await user.click(screen.getByText('Alterar Hora'));
    expect(screen.getAllByRole('combobox')[1]).toBeDisabled();
    expect(screen.getByLabelText('Hora manual no formato 24 horas')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });
});
