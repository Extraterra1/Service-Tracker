import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
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
    activityEntriesCount: 0,
    loadingActivity: false,
    onOpenLeaderboardPopup: vi.fn(),
    leaderboardLoading: false,
    statusLine: 'ok',
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

  it('opens activity popup when clicking activity section header', async () => {
    const user = userEvent.setup();
    const onOpenActivityPopup = vi.fn();

    render(<AppHeaderMenu {...createProps({ onOpenActivityPopup })} />);
    await user.click(screen.getByText('Atividade do Dia'));

    expect(onOpenActivityPopup).toHaveBeenCalled();
  });

  it('opens leaderboard popup when clicking leaderboard section header', async () => {
    const user = userEvent.setup();
    const onOpenLeaderboardPopup = vi.fn();

    render(<AppHeaderMenu {...createProps({ onOpenLeaderboardPopup })} />);
    await user.click(screen.getByText('Leaderboard'));

    expect(onOpenLeaderboardPopup).toHaveBeenCalled();
  });
});
