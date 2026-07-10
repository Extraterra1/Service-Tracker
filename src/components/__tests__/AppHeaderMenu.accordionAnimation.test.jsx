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
    canManageAccess: false,
    activeWorkspace: 'services',
    onWorkspaceChange: vi.fn(),
    pendingAccessRequests: [],
    managedAccessUsers: [],
    accessRequestDecisionUid: '',
    onApproveAccessRequest: vi.fn(),
    onDenyAccessRequest: vi.fn(),
    onRevokeAccessUser: vi.fn(),
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

  it('opens the native flights workspace without an external lookup link', async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    render(<AppHeaderMenu {...createProps({ onWorkspaceChange })} />);

    expect(screen.queryByRole('link', { name: 'Aviability Lookup' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voos' }));
    expect(onWorkspaceChange).toHaveBeenCalledWith('flights');
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

  it('hides access management from non-admin users', () => {
    render(<AppHeaderMenu {...createProps({ canManageAccess: false })} />);

    expect(screen.queryByText('Pedidos de Acesso')).not.toBeInTheDocument();
  });

  it('shows the reservations workspace action only to admins', async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    const { rerender } = render(
      <AppHeaderMenu {...createProps({ canManageAccess: false, onWorkspaceChange })} />
    );

    expect(screen.queryByRole('button', { name: 'Reservas' })).not.toBeInTheDocument();

    rerender(<AppHeaderMenu {...createProps({ canManageAccess: true, onWorkspaceChange })} />);
    await user.click(screen.getByRole('button', { name: 'Reservas' }));

    expect(onWorkspaceChange).toHaveBeenCalledWith('reservations');
  });

  it('offers Lista de Serviço and updates the title in the reservations workspace', async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    render(
      <AppHeaderMenu
        {...createProps({ canManageAccess: true, activeWorkspace: 'reservations', onWorkspaceChange })}
      />
    );

    expect(screen.getByRole('heading', { name: 'Reservas' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lista de Serviço' }));
    expect(onWorkspaceChange).toHaveBeenCalledWith('services');
  });

  it('offers Lista de Serviço and updates the title in the flights workspace', async () => {
    const user = userEvent.setup();
    const onWorkspaceChange = vi.fn();
    render(<AppHeaderMenu {...createProps({ activeWorkspace: 'flights', onWorkspaceChange })} />);

    expect(screen.getByRole('heading', { name: 'Voos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lista de Serviço' }));
    expect(onWorkspaceChange).toHaveBeenCalledWith('services');
    expect(screen.queryByRole('button', { name: 'Voos' })).not.toBeInTheDocument();
  });

  it('hides the pending request group when admins have no pending requests', async () => {
    const user = userEvent.setup();

    render(<AppHeaderMenu {...createProps({ canManageAccess: true })} />);
    await user.click(screen.getByText('Pedidos de Acesso'));

    expect(screen.queryByText('Pedidos pendentes')).not.toBeInTheDocument();
    expect(screen.queryByText('Sem pedidos pendentes.')).not.toBeInTheDocument();
    expect(screen.getByText('Utilizadores')).toBeInTheDocument();
    expect(screen.getByText('Sem utilizadores registados.')).toBeInTheDocument();
  });

  it('renders pending access requests and managed users for admins', async () => {
    const user = userEvent.setup();
    const onApproveAccessRequest = vi.fn();
    const onDenyAccessRequest = vi.fn();
    const onRevokeAccessUser = vi.fn();
    const pendingRequest = {
      uid: 'uid-1',
      displayName: 'New User',
      email: 'new@example.com',
      requestCount: 2,
    };
    const activeUser = {
      uid: 'staff-2',
      displayName: 'Staff Two',
      email: 'staff2@example.com',
      role: 'staff',
      active: true,
    };
    const inactiveUser = {
      uid: 'staff-3',
      displayName: 'Staff Three',
      email: 'staff3@example.com',
      role: 'admin',
      active: false,
    };
    const adminUser = {
      uid: 'staff-4',
      displayName: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      active: true,
    };

    render(
      <AppHeaderMenu
        {...createProps({
          canManageAccess: true,
          pendingAccessRequests: [pendingRequest],
          managedAccessUsers: [activeUser, inactiveUser, adminUser],
          onApproveAccessRequest,
          onDenyAccessRequest,
          onRevokeAccessUser,
        })}
      />
    );

    await user.click(screen.getByText('Pedidos de Acesso'));

    const accessSection = screen.getByText('Pedidos de Acesso').closest('details');
    expect(accessSection).not.toBeNull();
    expect(within(accessSection).getByText('New User')).toBeInTheDocument();
    expect(within(accessSection).getByText('new@example.com')).toBeInTheDocument();
    expect(within(accessSection).getByText('2 pedidos')).toBeInTheDocument();
    expect(within(accessSection).getByText('Staff Two')).toBeInTheDocument();
    expect(within(accessSection).getByText('staff2@example.com')).toBeInTheDocument();
    expect(within(accessSection).getByText('Staff Three')).toBeInTheDocument();
    expect(within(accessSection).getByText('Inativo')).toBeInTheDocument();
    expect(within(accessSection).getByText('Admin User')).toBeInTheDocument();
    expect(within(accessSection).queryByText('UID staff-2')).not.toBeInTheDocument();
    expect(within(accessSection).queryByText('UID staff-3')).not.toBeInTheDocument();

    const staffTwoRow = within(accessSection).getByText('Staff Two').closest('article');
    expect(staffTwoRow).not.toBeNull();
    const staffTwoTopRow = staffTwoRow.querySelector('.access-user-top-row');
    const staffTwoBottomRow = staffTwoRow.querySelector('.access-user-bottom-row');
    expect(staffTwoTopRow).not.toBeNull();
    expect(staffTwoBottomRow).not.toBeNull();
    expect(within(staffTwoTopRow).getByText('Staff Two')).toBeInTheDocument();
    expect(within(staffTwoTopRow).getByText('Ativo')).toBeInTheDocument();
    expect(within(staffTwoBottomRow).getByText('staff2@example.com')).toBeInTheDocument();
    expect(within(staffTwoBottomRow).getByRole('button', { name: 'Revogar acesso de Staff Two' })).toBeInTheDocument();
    expect(staffTwoRow.closest('.access-user-list')).not.toBeNull();
    expect(staffTwoRow).toHaveClass('is-active');

    const staffThreeRow = within(accessSection).getByText('Staff Three').closest('article');
    expect(staffThreeRow).toHaveClass('is-inactive');

    const adminRow = within(accessSection).getByText('Admin User').closest('article');
    expect(adminRow).not.toBeNull();
    expect(adminRow).toHaveClass('is-admin');
    expect(within(adminRow).getByLabelText('Admin')).toBeInTheDocument();
    expect(within(adminRow).queryByRole('button', { name: 'Revogar acesso de Admin User' })).not.toBeInTheDocument();

    await user.click(within(accessSection).getByRole('button', { name: 'Aprovar New User' }));
    await user.click(within(accessSection).getByRole('button', { name: 'Negar New User' }));
    await user.click(within(accessSection).getByRole('button', { name: 'Revogar acesso de Staff Two' }));

    expect(onApproveAccessRequest).toHaveBeenCalledWith(pendingRequest);
    expect(onDenyAccessRequest).toHaveBeenCalledWith(pendingRequest);
    expect(onRevokeAccessUser).toHaveBeenCalledWith(activeUser);
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
