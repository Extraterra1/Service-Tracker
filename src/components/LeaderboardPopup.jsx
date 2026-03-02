function getIdentityLabel(entry) {
  const displayName = String(entry?.displayName ?? '').trim();
  if (displayName) {
    return displayName;
  }

  const email = String(entry?.email ?? '').trim();
  if (email) {
    return email;
  }

  return 'Equipa';
}

function getAvatarInitials(entry) {
  const name = getIdentityLabel(entry);
  const words = name
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean);

  return (words[0]?.charAt(0) ?? 'E').toUpperCase();
}

function LeaderboardAvatar({ entry }) {
  const photoURL = String(entry?.photoURL ?? '').trim();
  const label = getIdentityLabel(entry);

  if (photoURL) {
    return <img className="leaderboard-avatar-image" src={photoURL} alt={label} loading="lazy" referrerPolicy="no-referrer" />;
  }

  return (
    <span className="leaderboard-avatar-fallback" aria-hidden="true">
      {getAvatarInitials(entry)}
    </span>
  );
}

function LeaderboardPodiumCard({ entry, position }) {
  if (!entry) {
    return null;
  }

  return (
    <article className={`leaderboard-podium-card leaderboard-podium-card-${position}`}>
      <p className="leaderboard-podium-position">#{entry.rank}</p>
      <div className="leaderboard-avatar">
        <LeaderboardAvatar entry={entry} />
      </div>
      <p className="leaderboard-name" title={getIdentityLabel(entry)}>
        {getIdentityLabel(entry)}
      </p>
      <p className="leaderboard-score">{entry.score} ações</p>
    </article>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="leaderboard-skeleton" aria-hidden="true">
      <section className="leaderboard-podium leaderboard-podium-skeleton">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={`leaderboard-skeleton-podium-${index}`} className="leaderboard-podium-card leaderboard-skeleton-card">
            <span className="leaderboard-skeleton-line leaderboard-skeleton-position" />
            <span className="leaderboard-skeleton-avatar leaderboard-skeleton-shimmer" />
            <span className="leaderboard-skeleton-line leaderboard-skeleton-name" />
            <span className="leaderboard-skeleton-line leaderboard-skeleton-score" />
          </article>
        ))}
      </section>

      <ul className="leaderboard-list leaderboard-list-skeleton">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={`leaderboard-skeleton-row-${index}`} className="leaderboard-list-item leaderboard-skeleton-row">
            <span className="leaderboard-skeleton-line leaderboard-skeleton-rank" />
            <span className="leaderboard-skeleton-avatar leaderboard-skeleton-avatar-small leaderboard-skeleton-shimmer" />
            <span className="leaderboard-skeleton-line leaderboard-skeleton-list-name" />
            <span className="leaderboard-skeleton-line leaderboard-skeleton-list-score" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaderboardPopup({
  period = 'weekly',
  data = null,
  lastLoadedAt = null,
  loading = false,
  errorMessage = '',
  onClose,
  onPeriodChange,
  onRefresh,
}) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const topOne = rows[0] ?? null;
  const topTwo = rows[1] ?? null;
  const topThree = rows[2] ?? null;
  const remainder = rows.slice(3);
  const totalActions = Number(data?.totalActions ?? 0);
  const participants = Number(data?.participants ?? rows.length);
  const lastLoadedLabel = lastLoadedAt
    ? new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lastLoadedAt))
    : '';

  return (
    <div
      className="leaderboard-popup-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="leaderboard-popup" role="dialog" aria-modal="true" aria-label="Leaderboard da equipa">
        <header className="leaderboard-popup-header">
          <div>
            <p className="leaderboard-popup-kicker">Leaderboard</p>
            <h3>Ações da Equipa</h3>
          </div>
          <button type="button" className="leaderboard-popup-close" onClick={onClose} aria-label="Fechar leaderboard">
            ✕
          </button>
        </header>

        <div className="leaderboard-toolbar">
          <div className="leaderboard-period-tabs" role="tablist" aria-label="Período do leaderboard">
            {[
              { id: 'weekly', label: 'Semana' },
              { id: 'monthly', label: 'Mês' },
              { id: 'all_time', label: 'All time' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                className={`leaderboard-period-tab ${period === option.id ? 'is-active' : ''}`}
                role="tab"
                aria-selected={period === option.id ? 'true' : 'false'}
                onClick={() => onPeriodChange(option.id)}
                disabled={loading}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button type="button" className="ghost-btn compact-btn" onClick={onRefresh} disabled={loading}>
            {loading ? 'A carregar...' : 'Atualizar'}
          </button>
        </div>

        <p className="leaderboard-meta">
          {participants} participantes · {totalActions} ações
          {data?.capped ? ' · limitado aos últimos 10000 registos' : ''}
          {lastLoadedLabel ? ` · atualizado às ${lastLoadedLabel}` : ''}
        </p>

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

        {loading ? (
          <>
            <p className="helper-text">A calcular leaderboard...</p>
            <LeaderboardSkeleton />
          </>
        ) : rows.length === 0 ? (
          <p className="helper-text">Sem ações para este período.</p>
        ) : (
          <>
            <section className="leaderboard-podium" aria-label="Top 3">
              <LeaderboardPodiumCard entry={topTwo} position={2} />
              <LeaderboardPodiumCard entry={topOne} position={1} />
              <LeaderboardPodiumCard entry={topThree} position={3} />
            </section>

            {remainder.length > 0 ? (
              <ul className="leaderboard-list" aria-label="Ranking completo">
                {remainder.map((entry) => (
                  <li key={`leaderboard-row-${entry.key}`} className="leaderboard-list-item">
                    <span className="leaderboard-list-rank">#{entry.rank}</span>
                    <span className="leaderboard-avatar leaderboard-avatar-small">
                      <LeaderboardAvatar entry={entry} />
                    </span>
                    <span className="leaderboard-list-name">{getIdentityLabel(entry)}</span>
                    <span className="leaderboard-list-score">{entry.score}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export default LeaderboardPopup;
