function AuthPanel({
  user,
  accessState,
  checkingAccess,
  pin,
  pinSyncState,
  onPinChange,
  onSignIn,
  onSignOut,
}) {
  if (!user) {
    return (
      <section className="auth-panel">
        <button type="button" className="primary-btn" onClick={onSignIn}>
          Entrar com Google
        </button>
        <p className="helper-text">Acesso restrito a equipa autorizada.</p>
      </section>
    )
  }

  return (
    <section className="auth-panel">
      <div className="auth-meta">
        <p className="user-name">{user.displayName || user.email}</p>
        <p className="user-email">{user.email}</p>
      </div>

      <label className="field-inline field-inline-pin" htmlFor="api-pin">
        PIN API
        <input
          id="api-pin"
          type="password"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(event) => onPinChange(event.target.value.replace(/[^0-9]/g, ''))}
        />
      </label>

      <button type="button" className="ghost-btn" onClick={onSignOut}>
        Sair
      </button>

      {checkingAccess ? <p className="helper-text">A validar acesso...</p> : null}
      {pinSyncState === 'syncing' ? <p className="helper-text">A sincronizar PIN da conta...</p> : null}
      {pinSyncState === 'synced' && pin ? (
        <p className="helper-text">PIN sincronizado com a conta Google.</p>
      ) : null}
      {accessState === 'denied' ? <p className="error-banner">Conta sem acesso. Adicione na allowlist.</p> : null}
    </section>
  )
}

export default AuthPanel
