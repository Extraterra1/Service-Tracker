import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ListChecks, Menu, MoonStar, Plane, Star, SunMedium, UserX, X } from 'lucide-react';
import AuthPanel from './AuthPanel';
import justDriveLogo from '../assets/Logo Just Drive Madeira-1.png';

const MENU_SECTION_CLOSE_ANIMATION_MS = 360;
const MENU_SECTION_KEYS = {
  account: 'account',
  accessRequests: 'accessRequests',
  completed: 'completed',
  timeOverride: 'timeOverride',
  activity: 'activity',
  carHistory: 'carHistory',
  leaderboard: 'leaderboard'
};

function createMenuSectionState() {
  return {
    [MENU_SECTION_KEYS.account]: false,
    [MENU_SECTION_KEYS.accessRequests]: false,
    [MENU_SECTION_KEYS.completed]: false,
    [MENU_SECTION_KEYS.timeOverride]: false,
    [MENU_SECTION_KEYS.activity]: false,
    [MENU_SECTION_KEYS.carHistory]: false,
    [MENU_SECTION_KEYS.leaderboard]: false
  };
}

function updateMenuSectionState(setter, key, value) {
  setter((previous) => {
    if (previous[key] === value) {
      return previous;
    }

    return {
      ...previous,
      [key]: value
    };
  });
}

function getMenuItemLabel(item) {
  const serviceLabel = item.serviceType === 'return' ? 'Recolha' : 'Entrega';
  const itemName = item.name || item.id || item.itemId;
  const displayTime = item.overrideTime || item.displayTime || item.time || '--:--';
  return `${displayTime} - ${serviceLabel} - ${itemName}`;
}

function getAccessRequestLabel(request) {
  return request.displayName || request.email || request.uid || 'Utilizador';
}

function getAccessRequestCountLabel(requestCount) {
  const count = Number(requestCount ?? 0) || 1;
  return count === 1 ? '1 pedido' : `${count} pedidos`;
}

function getAccessUserLabel(accessUser) {
  return accessUser.displayName || accessUser.email || accessUser.uid || 'Utilizador';
}

function getAccessStatusLabel(active) {
  return active ? 'Ativo' : 'Inativo';
}

function AppHeaderMenu({
  menuPanelRef,
  theme,
  onToggleTheme,
  user,
  accessState,
  checkingAccess,
  pin,
  pinSyncState,
  onOpenAccountSection,
  onPinChange,
  onSignIn,
  onSignOut,
  manualCompletedCandidates,
  manualCompletedItemId,
  onManualCompletedItemIdChange,
  onAddToCompleted,
  updatingItemId,
  allServiceItems,
  timeOverrideItemId,
  onTimeOverrideSelectionChange,
  timeOverrideValue,
  onTimeOverrideValueChange,
  hasMenuTimeOverrideInput,
  isMenuTimeOverrideValid,
  selectedTimeOverrideItem,
  onSaveTimeOverride,
  canResetSelectedTimeOverride,
  onResetTimeOverride,
  onOpenActivityPopup,
  onOpenCarHistoryPopup,
  onOpenLeaderboardPopup,
  onCopySessionDiagnostics,
  diagnosticsStatusMessage = '',
  canManageAccess = false,
  activeWorkspace = 'services',
  onWorkspaceChange,
  pendingAccessRequests = [],
  managedAccessUsers = [],
  accessRequestDecisionUid = '',
  onApproveAccessRequest,
  onDenyAccessRequest,
  onRevokeAccessUser,
  leaderboardLoading,
  statusLine,
  canMutateSelectedDate = true,
  children,
}) {
  const [openSections, setOpenSections] = useState(() => createMenuSectionState());
  const [closingSections, setClosingSections] = useState(() => createMenuSectionState());
  const closingTimersRef = useRef({});
  useEffect(
    () => () => {
      Object.values(closingTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    },
    []
  );

  const handleSectionSummaryClick = (sectionKey, onOpen) => (event) => {
    event.preventDefault();

    const isOpen = openSections[sectionKey] === true;
    const isClosing = closingSections[sectionKey] === true;
    const existingTimer = closingTimersRef.current[sectionKey];

    if (isClosing) {
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
        delete closingTimersRef.current[sectionKey];
      }

      updateMenuSectionState(setOpenSections, sectionKey, true);
      updateMenuSectionState(setClosingSections, sectionKey, false);
      onOpen?.();
      return;
    }

    if (isOpen) {
      updateMenuSectionState(setClosingSections, sectionKey, true);

      closingTimersRef.current[sectionKey] = window.setTimeout(() => {
        updateMenuSectionState(setOpenSections, sectionKey, false);
        updateMenuSectionState(setClosingSections, sectionKey, false);
        delete closingTimersRef.current[sectionKey];
      }, MENU_SECTION_CLOSE_ANIMATION_MS);
      return;
    }

    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      delete closingTimersRef.current[sectionKey];
    }

    updateMenuSectionState(setOpenSections, sectionKey, true);
    onOpen?.();
  };

  return (
    <header className="app-header app-header-compact">
      <div className="brand-block">
        <img className="header-logo" src={justDriveLogo} alt="JustDrive Madeira Rent-A-Car" />
        <div className="title-block">
          <p className="eyebrow">Operação diária</p>
          <h1>{activeWorkspace === 'reservations' ? 'Reservas' : activeWorkspace === 'flights' ? 'Voos' : 'Lista de Serviço'}</h1>
        </div>
      </div>

      <div className="header-control-cluster">
        {children}

      <details ref={menuPanelRef} className="menu-panel">
        <summary className="ghost-btn menu-summary">
          <Menu className="toolbar-icon" aria-hidden="true" />
          <span className="sr-only">Menu</span>
        </summary>
        <div className="menu-content">
          <div className="menu-head">
            <div className="menu-head-copy">
              <p className="menu-title">Operação diária</p>
              <p className="subtle-text">Definições rápidas.</p>
            </div>
            <button
              type="button"
              className="theme-icon-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <SunMedium className="theme-icon" aria-hidden="true" /> : <MoonStar className="theme-icon" aria-hidden="true" />}
            </button>
          </div>

          <div className="menu-sections">
            {activeWorkspace !== 'services' ? (
              <div className="menu-section">
                <button
                  type="button"
                  className="menu-section-summary menu-section-summary--action menu-workspace-action"
                  onClick={() => onWorkspaceChange?.('services')}
                >
                  <ListChecks aria-hidden="true" />
                  Lista de Serviço
                </button>
              </div>
            ) : null}
            {activeWorkspace !== 'flights' ? (
              <div className="menu-section">
                <button
                  type="button"
                  className="menu-section-summary menu-section-summary--action menu-workspace-action"
                  onClick={() => onWorkspaceChange?.('flights')}
                >
                  <Plane aria-hidden="true" />
                  Voos
                </button>
              </div>
            ) : null}
            {canManageAccess && activeWorkspace !== 'reservations' ? (
              <div className="menu-section">
                <button
                  type="button"
                  className="menu-section-summary menu-section-summary--action menu-workspace-action"
                  onClick={() => onWorkspaceChange?.('reservations')}
                >
                  <CalendarDays aria-hidden="true" />
                  Reservas
                </button>
              </div>
            ) : null}
            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.account] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.account] || closingSections[MENU_SECTION_KEYS.account]}
            >
              <summary className="menu-section-summary" onClick={handleSectionSummaryClick(MENU_SECTION_KEYS.account, onOpenAccountSection)}>
                Conta e PIN
              </summary>
              <div className="menu-section-body">
                <AuthPanel
                  user={user}
                  accessState={accessState}
                  checkingAccess={checkingAccess}
                  pin={pin}
                  pinSyncState={pinSyncState}
                  onPinChange={onPinChange}
                  onSignIn={onSignIn}
                  onSignOut={onSignOut}
                />
                <div className="menu-account-tools">
                  <button type="button" className="menu-subtle-action" onClick={onCopySessionDiagnostics}>
                    Copiar diagnóstico de sessão
                  </button>
                  {diagnosticsStatusMessage ? <p className="menu-diagnostics-status">{diagnosticsStatusMessage}</p> : null}
                </div>
              </div>
            </details>

            {canManageAccess ? (
              <details
                className={`menu-section ${closingSections[MENU_SECTION_KEYS.accessRequests] ? 'is-closing' : ''}`}
                open={openSections[MENU_SECTION_KEYS.accessRequests] || closingSections[MENU_SECTION_KEYS.accessRequests]}
              >
                <summary className="menu-section-summary" onClick={handleSectionSummaryClick(MENU_SECTION_KEYS.accessRequests)}>
                  <span>Pedidos de Acesso</span>
                  {pendingAccessRequests.length > 0 ? (
                    <span className="menu-section-count-pill" aria-label={`${pendingAccessRequests.length} pedidos pendentes`}>
                      <span className="menu-section-count-pulse" aria-hidden="true" />
                      {pendingAccessRequests.length}
                    </span>
                  ) : null}
                </summary>
                <div className="menu-section-body access-management-body">
                  {pendingAccessRequests.length > 0 ? (
                    <div className="access-management-group">
                      <p className="access-management-heading">Pedidos pendentes</p>
                      <div className="access-request-list">
                        {pendingAccessRequests.map((request) => {
                          const requestLabel = getAccessRequestLabel(request);
                          const isDeciding = accessRequestDecisionUid === request.uid;

                          return (
                            <article className="access-request-row" key={request.uid}>
                              <div className="access-request-copy">
                                <p className="access-request-name">{requestLabel}</p>
                                {request.email ? <p className="access-request-email">{request.email}</p> : null}
                                <p className="access-request-meta">
                                  <span>{getAccessRequestCountLabel(request.requestCount)}</span>
                                  {request.uid ? <span>UID {request.uid}</span> : null}
                                </p>
                              </div>
                              <div className="access-request-actions">
                                <button
                                  type="button"
                                  className="ghost-btn compact-btn access-request-action access-request-approve"
                                  onClick={() => onApproveAccessRequest?.(request)}
                                  disabled={isDeciding}
                                  aria-label={`Aprovar ${requestLabel}`}
                                >
                                  <Check className="access-request-action-icon" aria-hidden="true" />
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  className="ghost-btn compact-btn access-request-action access-request-deny"
                                  onClick={() => onDenyAccessRequest?.(request)}
                                  disabled={isDeciding}
                                  aria-label={`Negar ${requestLabel}`}
                                >
                                  <X className="access-request-action-icon" aria-hidden="true" />
                                  Negar
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="access-management-group">
                    <p className="access-management-heading">Utilizadores</p>
                    {managedAccessUsers.length === 0 ? (
                      <p className="subtle-text">Sem utilizadores registados.</p>
                    ) : (
                      <div className="access-request-list access-user-list">
                        {managedAccessUsers.map((accessUser) => {
                          const accessUserLabel = getAccessUserLabel(accessUser);
                          const isDeciding = accessRequestDecisionUid === accessUser.uid;
                          const isSelf = accessUser.uid && accessUser.uid === user?.uid;
                          const isAdmin = accessUser.role === 'admin';
                          const canRevokeUser = accessUser.active && !isSelf && !isAdmin;

                          return (
                            <article
                              className={`access-request-row access-user-row ${accessUser.active ? 'is-active' : 'is-inactive'} ${isAdmin ? 'is-admin' : ''}`}
                              key={accessUser.uid}
                            >
                              <div className="access-user-top-row">
                                <p className="access-request-name">
                                  <span>{accessUserLabel}</span>
                                  {isAdmin ? <Star className="access-admin-icon" aria-label="Admin" /> : null}
                                </p>
                                <p className="access-request-meta">
                                  <span className={`access-status-pill ${accessUser.active ? 'is-active' : 'is-inactive'}`}>
                                    {getAccessStatusLabel(accessUser.active)}
                                  </span>
                                </p>
                              </div>
                              <div className="access-user-bottom-row">
                                {accessUser.email ? <p className="access-request-email">{accessUser.email}</p> : <span aria-hidden="true" />}
                                {canRevokeUser ? (
                                  <div className="access-request-actions">
                                    <button
                                      type="button"
                                      className="ghost-btn compact-btn access-request-action access-request-deny"
                                      onClick={() => onRevokeAccessUser?.(accessUser)}
                                      disabled={isDeciding}
                                      aria-label={`Revogar acesso de ${accessUserLabel}`}
                                    >
                                      <UserX className="access-request-action-icon" aria-hidden="true" />
                                      Revogar
                                    </button>
                                  </div>
                                ) : (
                                  <span aria-hidden="true" />
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            ) : null}

            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.completed] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.completed] || closingSections[MENU_SECTION_KEYS.completed]}
            >
              <summary className="menu-section-summary" onClick={handleSectionSummaryClick(MENU_SECTION_KEYS.completed)}>
                Finalizados
              </summary>
              <div className="menu-section-body">
                <p className="subtle-text">Move um serviço concluído para a secção "Finalizados" sem esperar 1 hora.</p>
                <div className="manual-completed-controls">
                  <select
                    className="manual-completed-select"
                    value={manualCompletedItemId}
                    onChange={(event) => onManualCompletedItemIdChange(event.target.value)}
                    disabled={!canMutateSelectedDate || manualCompletedCandidates.length === 0 || updatingItemId !== ''}
                  >
                    {manualCompletedCandidates.length === 0 ? <option value="">Sem concluídos recentes</option> : null}
                    {manualCompletedCandidates.map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {getMenuItemLabel(item)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="ghost-btn compact-btn"
                    onClick={onAddToCompleted}
                    disabled={!canMutateSelectedDate || !manualCompletedItemId || updatingItemId !== ''}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </details>

            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.timeOverride] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.timeOverride] || closingSections[MENU_SECTION_KEYS.timeOverride]}
            >
              <summary className="menu-section-summary" onClick={handleSectionSummaryClick(MENU_SECTION_KEYS.timeOverride)}>
                Alterar Hora
              </summary>
              <div className="menu-section-body">
                <p className="subtle-text">Define uma hora manual.</p>
                <div className="menu-time-controls">
                  <select
                    className="manual-completed-select"
                    value={timeOverrideItemId}
                    onChange={(event) => onTimeOverrideSelectionChange(event.target.value)}
                    disabled={!canMutateSelectedDate || allServiceItems.length === 0 || updatingItemId !== ''}
                  >
                    {allServiceItems.length === 0 ? <option value="">Sem serviços disponíveis</option> : null}
                    {allServiceItems.map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {getMenuItemLabel(item)}
                      </option>
                    ))}
                  </select>

                  <div className="menu-time-row">
                    <input
                      type="time"
                      step={60}
                      className="menu-time-input"
                      value={timeOverrideValue}
                      onChange={(event) => onTimeOverrideValueChange(event.target.value)}
                      disabled={!canMutateSelectedDate || !selectedTimeOverrideItem || updatingItemId !== ''}
                      aria-label="Hora manual no formato 24 horas"
                    />
                    <button
                      type="button"
                      className="ghost-btn compact-btn"
                      onClick={onSaveTimeOverride}
                      disabled={!canMutateSelectedDate || !selectedTimeOverrideItem || !hasMenuTimeOverrideInput || !isMenuTimeOverrideValid || updatingItemId !== ''}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="ghost-btn compact-btn"
                      onClick={onResetTimeOverride}
                      disabled={!canMutateSelectedDate || !canResetSelectedTimeOverride || updatingItemId !== ''}
                    >
                      Reset
                    </button>
                  </div>
                  {!canMutateSelectedDate ? <p className="helper-text">Só é possível alterar o dia atual.</p> : null}
                  {hasMenuTimeOverrideInput && !isMenuTimeOverrideValid ? <p className="helper-text">Formato inválido. Usa HH:mm.</p> : null}
                </div>
              </div>
            </details>

            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.activity] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.activity] || closingSections[MENU_SECTION_KEYS.activity]}
            >
              <summary
                className="menu-section-summary menu-section-summary--action"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenActivityPopup();
                }}
              >
                Atividade do Dia
              </summary>
            </details>

            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.carHistory] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.carHistory] || closingSections[MENU_SECTION_KEYS.carHistory]}
            >
              <summary
                className="menu-section-summary menu-section-summary--action"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenCarHistoryPopup();
                }}
              >
                Histórico de Viaturas
              </summary>
            </details>

            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.leaderboard] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.leaderboard] || closingSections[MENU_SECTION_KEYS.leaderboard]}
            >
              <summary
                className="menu-section-summary menu-section-summary--action"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenLeaderboardPopup();
                }}
              >
                {leaderboardLoading ? 'A carregar leaderboard...' : 'Leaderboard'}
              </summary>
            </details>

          </div>
          <p className="menu-sync-footnote">{statusLine}</p>
        </div>
      </details>
      </div>
    </header>
  );
}

export default AppHeaderMenu;
