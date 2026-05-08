import { useEffect, useRef, useState } from 'react';
import { Menu, MoonStar, SunMedium } from 'lucide-react';
import AuthPanel from './AuthPanel';
import justDriveLogo from '../assets/Logo Just Drive Madeira-1.png';

const MENU_SECTION_CLOSE_ANIMATION_MS = 360;
const MENU_SECTION_KEYS = {
  account: 'account',
  completed: 'completed',
  timeOverride: 'timeOverride',
  activity: 'activity',
  carHistory: 'carHistory',
  leaderboard: 'leaderboard'
};

function createMenuSectionState() {
  return {
    [MENU_SECTION_KEYS.account]: false,
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

function getAviabilityLookupUrl(allServiceItems, selectedDate) {
  const baseUrl = new URL('https://fncfutures.vercel.app');
  const arrivalFlightNumbers = [...new Set(
    allServiceItems
      .filter((item) => item?.serviceType === 'pickup')
      .map((item) => String(item?.flightNumber ?? '').trim())
      .filter(Boolean)
  )];

  if (arrivalFlightNumbers.length > 0) {
    baseUrl.searchParams.set('flights', arrivalFlightNumbers.join(','));
  }

  if (String(selectedDate ?? '').trim()) {
    baseUrl.searchParams.set('date', String(selectedDate).trim());
  }

  return baseUrl.toString();
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
  leaderboardLoading,
  statusLine,
  selectedDate,
  canMutateSelectedDate = true,
  children,
}) {
  const [openSections, setOpenSections] = useState(() => createMenuSectionState());
  const [closingSections, setClosingSections] = useState(() => createMenuSectionState());
  const closingTimersRef = useRef({});
  const aviabilityLookupUrl = getAviabilityLookupUrl(allServiceItems, selectedDate);

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
          <h1>Lista de Serviço</h1>
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

            <div className="menu-section">
              <a
                className="menu-section-summary menu-section-summary--action"
                href={aviabilityLookupUrl}
                target="_blank"
                rel="noreferrer"
              >
                Aviability Lookup
              </a>
            </div>
          </div>
          <p className="menu-sync-footnote">{statusLine}</p>
        </div>
      </details>
      </div>
    </header>
  );
}

export default AppHeaderMenu;
