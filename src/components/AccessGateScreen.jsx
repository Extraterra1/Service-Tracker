const STATE_COPY = {
  pending: {
    eyebrow: 'Pedido enviado',
    title: 'Aguardando aprovação',
    body: 'A tua conta está autenticada, mas ainda precisa de aprovação da equipa no Telegram.',
  },
  denied: {
    eyebrow: 'Acesso recusado',
    title: 'Conta sem acesso',
    body: 'O teu pedido foi recusado. Contacta o administrador para reabrir o pedido.',
  },
  blocked: {
    eyebrow: 'Conta bloqueada',
    title: 'Acesso bloqueado',
    body: 'Esta conta foi bloqueada. Fala com o administrador para rever o bloqueio.',
  },
}

function AccessGateScreen({
  state = 'pending',
  message = '',
  checking = false,
  polling = false,
  onRetry,
  onSignOut,
}) {
  const copy = STATE_COPY[state] || STATE_COPY.pending
  const isPending = state === 'pending'

  return (
    <main className="access-gate-screen" aria-live="polite">
      <section className={`access-gate-card access-gate-${state}`}>
        <p className="access-gate-eyebrow">{copy.eyebrow}</p>
        <h1 className="access-gate-title">{copy.title}</h1>
        <p className="access-gate-body">{copy.body}</p>
        {message ? <p className="access-gate-message">{message}</p> : null}

        <div className="access-gate-actions">
          {isPending ? (
            <button type="button" className="ghost-btn access-gate-btn" onClick={onRetry} disabled={checking || polling}>
              {checking || polling ? 'A verificar...' : 'Verificar agora'}
            </button>
          ) : null}
          <button type="button" className="primary-btn access-gate-btn" onClick={onSignOut}>
            Sair
          </button>
        </div>

        {isPending ? <p className="helper-text">Verificação automática a cada 20 segundos.</p> : null}
      </section>
    </main>
  )
}

export default AccessGateScreen
