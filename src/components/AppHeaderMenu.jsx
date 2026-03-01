import { MoonStar, SunMedium } from 'lucide-react';
import AuthPanel from './AuthPanel';

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
  statusLine
}) {
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
              <p className="subtle-text">Definições rápidas para a operação de hoje.</p>
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
            <details className="menu-section" open>
              <summary className="menu-section-summary">Conta e PIN</summary>
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

            <details className="menu-section">
              <summary className="menu-section-summary">Completados</summary>
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

                  <button
                    type="button"
                    className="ghost-btn compact-btn"
                    onClick={onAddToCompleted}
                    disabled={!manualCompletedItemId || updatingItemId !== ''}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </details>

            <details className="menu-section">
              <summary className="menu-section-summary">Alterar Hora</summary>
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
                      type="text"
                      inputMode="text"
                      placeholder="HH:mm"
                      pattern="^([01]\\d|2[0-3]):([0-5]\\d)$"
                      maxLength={5}
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

            <details className="menu-section">
              <summary className="menu-section-summary">Atividade do Dia</summary>
              <div className="menu-section-body">
                <p className="subtle-text">Histórico de hora, pronto/não pronto e concluídos em {selectedDate}.</p>
                <button type="button" className="ghost-btn compact-btn menu-activity-open-btn" onClick={onOpenActivityPopup}>
                  Ver atividade ({activityEntriesCount})
                </button>
                {loadingActivity ? <p className="helper-text">A carregar atividade...</p> : null}
              </div>
            </details>
          </div>
          <p className="menu-sync-footnote">{statusLine}</p>
        </div>
      </details>
    </header>
  );
}

export default AppHeaderMenu;
