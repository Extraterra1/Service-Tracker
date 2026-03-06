import { useEffect, useRef, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import AuthPanel from './AuthPanel';

const MENU_SECTION_CLOSE_ANIMATION_MS = 360;
const MENU_SECTION_KEYS = {
  account: 'account',
  completed: 'completed',
  timeOverride: 'timeOverride',
  activity: 'activity',
  leaderboard: 'leaderboard'
};

function createMenuSectionState() {
  return {
    [MENU_SECTION_KEYS.account]: false,
    [MENU_SECTION_KEYS.completed]: false,
    [MENU_SECTION_KEYS.timeOverride]: false,
    [MENU_SECTION_KEYS.activity]: false,
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

function AppHeaderMenu({
  menuPanelRef,
  theme,
  onToggleTheme,
  user,
  accessState,
  checkingAccess,
  pin,
  pinSyncState,
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
  selectedDate,
  onOpenActivityPopup,
  activityEntriesCount,
  loadingActivity,
  onOpenLeaderboardPopup,
  leaderboardLoading,
  statusLine
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

  const handleSectionSummaryClick = (sectionKey) => (event) => {
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
  };

  return (
    <header className="app-header app-header-compact">
      <div className="title-block">
        <p className="eyebrow">JustDrive</p>
        <h1>Lista de Serviço</h1>
      </div>

      <details ref={menuPanelRef} className="menu-panel">
        <summary className="ghost-btn menu-summary">Menu</summary>
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
              <summary className="menu-section-summary" onClick={handleSectionSummaryClick(MENU_SECTION_KEYS.account)}>
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
              </div>
            </details>

            <details
              className={`menu-section ${closingSections[MENU_SECTION_KEYS.completed] ? 'is-closing' : ''}`}
              open={openSections[MENU_SECTION_KEYS.completed] || closingSections[MENU_SECTION_KEYS.completed]}
            >
              <summary className="menu-section-summary" onClick={handleSectionSummaryClick(MENU_SECTION_KEYS.completed)}>
                Completados
              </summary>
              <div className="menu-section-body">
                <p className="subtle-text">Move um serviço concluído para a secção "Completados" sem esperar 1 hora.</p>
                <div className="manual-completed-controls">
                  <select
                    className="manual-completed-select"
                    value={manualCompletedItemId}
                    onChange={(event) => onManualCompletedItemIdChange(event.target.value)}
                    disabled={manualCompletedCandidates.length === 0 || updatingItemId !== ''}
                  >
                    {manualCompletedCandidates.length === 0 ? <option value="">Sem concluídos recentes</option> : null}
                    {manualCompletedCandidates.map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {getMenuItemLabel(item)}
                      </option>
                    ))}
                  </select>

                  <button type="button" className="ghost-btn compact-btn" onClick={onAddToCompleted} disabled={!manualCompletedItemId || updatingItemId !== ''}>
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
                    disabled={allServiceItems.length === 0 || updatingItemId !== ''}
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
                      disabled={!selectedTimeOverrideItem || updatingItemId !== ''}
                      aria-label="Hora manual no formato 24 horas"
                    />
                    <button
                      type="button"
                      className="ghost-btn compact-btn"
                      onClick={onSaveTimeOverride}
                      disabled={!selectedTimeOverrideItem || !hasMenuTimeOverrideInput || !isMenuTimeOverrideValid || updatingItemId !== ''}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="ghost-btn compact-btn"
                      onClick={onResetTimeOverride}
                      disabled={!canResetSelectedTimeOverride || updatingItemId !== ''}
                    >
                      Reset
                    </button>
                  </div>
                  {hasMenuTimeOverrideInput && !isMenuTimeOverrideValid ? <p className="helper-text">Formato inválido. Usa HH:mm.</p> : null}
                </div>
              </div>
            </details>

            <button
              type="button"
              className="menu-section menu-section-summary menu-section-action-btn"
              onClick={onOpenActivityPopup}
            >
              {loadingActivity ? 'A carregar atividade...' : `Atividade do Dia (${activityEntriesCount})`}
            </button>

            <button
              type="button"
              className="menu-section menu-section-summary menu-section-action-btn"
              onClick={onOpenLeaderboardPopup}
            >
              {leaderboardLoading ? 'A carregar leaderboard...' : 'Leaderboard'}
            </button>
          </div>
          <p className="menu-sync-footnote">{statusLine}</p>
        </div>
      </details>
    </header>
  );
}

export default AppHeaderMenu;
