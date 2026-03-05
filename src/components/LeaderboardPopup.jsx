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

  const first = words[0]?.charAt(0) ?? 'E';
  const second = words[1]?.charAt(0) ?? '';
  return `${first}${second}`.toUpperCase();
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLastActionLabel(value, now = new Date()) {
  const date = parseDateValue(value);
  if (!date) {
    return 'Sem ação recente';
  }

  const nowDate = parseDateValue(now) ?? new Date();
  const deltaMs = Math.max(0, nowDate.getTime() - date.getTime());
  const deltaMinutes = Math.floor(deltaMs / 60000);

  if (deltaMinutes < 1) {
    return 'agora mesmo';
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m atrás`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h atrás`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) {
    return `${deltaDays}d atrás`;
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
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

function TrophyIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M8 4V2h8v2h3a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5h-.05A5.01 5.01 0 0 1 13 15.9V18h4v2H7v-2h4v-2.1A5.01 5.01 0 0 1 9.05 12H9a5 5 0 0 1-5-5V5a1 1 0 0 1 1-1h3Zm-2 2v1a3 3 0 0 0 3 3V6H6Zm12 0h-3v4a3 3 0 0 0 3-3V6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d="M5.53 5.53 10 10m0 0 4.47 4.47M10 10l4.47-4.47M10 10 5.53 14.47" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LeaderboardPodiumCard({ entry, position }) {
  const isFirst = position === 1;
  const isThird = position === 3;

  if (!entry) {
    return (
      <article className={`leaderboard-podium-card leaderboard-podium-card-${position} is-empty`} aria-hidden="true">
        <div className="leaderboard-podium-avatar-wrap">
          <span className="leaderboard-avatar leaderboard-avatar-podium" />
        </div>
        <p className="leaderboard-name leaderboard-podium-name">-</p>
        <p className="leaderboard-podium-score-value">0</p>
        <p className="leaderboard-podium-score-unit">ações</p>
        <div className={`leaderboard-podium-base leaderboard-podium-base-${position}`}>
          <span className="leaderboard-podium-base-icon">
            <TrophyIcon />
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className={`leaderboard-podium-card leaderboard-podium-card-${position}`}>
      <div className="leaderboard-podium-avatar-wrap">
        {isFirst ? (
          <span className="leaderboard-podium-highlight">
            <TrophyIcon />
          </span>
        ) : null}

        <div className="leaderboard-avatar leaderboard-avatar-podium">
          <LeaderboardAvatar entry={entry} />
        </div>

        <span className={`leaderboard-podium-rank-badge leaderboard-podium-rank-badge-${position}`}>{entry.rank}</span>
      </div>

      <p className="leaderboard-name leaderboard-podium-name" title={getIdentityLabel(entry)}>
        {getIdentityLabel(entry)}
      </p>
      <p className="leaderboard-podium-score-value">{entry.score}</p>
      <p className="leaderboard-podium-score-unit">ações</p>

      <div className={`leaderboard-podium-base leaderboard-podium-base-${position}`}>
        <span className="leaderboard-podium-base-icon" aria-hidden="true">
          <TrophyIcon className={isFirst ? 'is-primary' : isThird ? 'is-bronze' : 'is-silver'} />
        </span>
      </div>
    </article>
  );
}

function LeaderboardListRow({ entry }) {
  return (
    <li className="leaderboard-list-item">
      <span className="leaderboard-list-rank">{entry.rank}</span>

      <span className="leaderboard-avatar leaderboard-avatar-small">
        <LeaderboardAvatar entry={entry} />
      </span>

      <span className="leaderboard-list-main">
        <span className="leaderboard-list-name">{getIdentityLabel(entry)}</span>
        <span className="leaderboard-list-last-action">Última ação: {formatLastActionLabel(entry?.lastActionAt)}</span>
      </span>

      <span className="leaderboard-list-score-stack">
        <span className="leaderboard-list-score">{entry.score}</span>
        <span className="leaderboard-list-score-label">AÇÕES</span>
      </span>
    </li>
  );
}

function LeaderboardSkeleton() {
  const podiumOrder = [2, 1, 3];

  return (
    <div className="leaderboard-skeleton" aria-hidden="true">
      <section className="leaderboard-podium-stage leaderboard-podium-skeleton">
        <div className="leaderboard-podium-track">
          {podiumOrder.map((position) => (
            <article
              key={`leaderboard-skeleton-podium-${position}`}
              className={`leaderboard-podium-card leaderboard-podium-card-${position} leaderboard-skeleton-card`}
            >
              <span className="leaderboard-skeleton-avatar leaderboard-skeleton-shimmer" />
              <span className="leaderboard-skeleton-line leaderboard-skeleton-name" />
              <span className="leaderboard-skeleton-line leaderboard-skeleton-score" />
              <div className={`leaderboard-podium-base leaderboard-podium-base-${position}`} />
            </article>
          ))}
        </div>
      </section>

      <div className="leaderboard-list-wrap">
        <ul className="leaderboard-list leaderboard-list-skeleton">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={`leaderboard-skeleton-row-${index}`} className="leaderboard-list-item leaderboard-skeleton-row">
              <span className="leaderboard-skeleton-line leaderboard-skeleton-rank" />
              <span className="leaderboard-skeleton-avatar leaderboard-skeleton-avatar-small leaderboard-skeleton-shimmer" />
              <span className="leaderboard-skeleton-line leaderboard-skeleton-list-name" />
              <span className="leaderboard-skeleton-line leaderboard-skeleton-list-score" />
            </li>
          ))}
        </ul>
      </div>
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
}) {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const topOne = rows[0] ?? null;
  const topTwo = rows[1] ?? null;
  const topThree = rows[2] ?? null;
  const remainder = rows.slice(3);
  const hasRows = rows.length > 0;
  const isLoadingWithRows = loading && hasRows;
  const isInitialLoading = loading && !hasRows;
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
        <div className="leaderboard-popup-top">
          <header className="leaderboard-popup-header">
            <div>
              <p className="leaderboard-popup-kicker">Leaderboard</p>
              <h3>Ações da Equipa</h3>
            </div>
            <button type="button" className="leaderboard-popup-close" onClick={onClose} aria-label="Fechar leaderboard">
              <CloseIcon />
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
          </div>

          <p className="leaderboard-meta">
            {participants} participantes · {totalActions} ações
            {data?.capped ? ' · limitado aos últimos 10000 registos' : ''}
            {lastLoadedLabel ? ` · atualizado às ${lastLoadedLabel}` : ''}
          </p>

          {errorMessage ? <p className="error-banner leaderboard-error-banner">{errorMessage}</p> : null}
        </div>

        {isInitialLoading ? (
          <>
            <p className="helper-text leaderboard-helper-text">A calcular leaderboard...</p>
            <LeaderboardSkeleton />
          </>
        ) : !hasRows ? (
          <p className="helper-text leaderboard-helper-text leaderboard-helper-empty">Sem ações para este período.</p>
        ) : (
          <>
            {isLoadingWithRows ? <p className="helper-text leaderboard-helper-text">A calcular leaderboard...</p> : null}
            <div className={`leaderboard-content-shell ${isLoadingWithRows ? 'is-loading' : ''}`}>
              <div className={`leaderboard-popup-body ${remainder.length > 0 ? 'has-list' : 'no-list'}`}>
                <section className="leaderboard-podium-stage" aria-label="Top 3">
                  <div className="leaderboard-podium-track">
                    <LeaderboardPodiumCard entry={topTwo} position={2} />
                    <LeaderboardPodiumCard entry={topOne} position={1} />
                    <LeaderboardPodiumCard entry={topThree} position={3} />
                  </div>
                </section>
                {remainder.length > 0 ? (
                  <div className="leaderboard-list-wrap">
                    <ul className="leaderboard-list" aria-label="Ranking completo">
                      {remainder.map((entry) => (
                        <LeaderboardListRow key={`leaderboard-row-${entry.key}`} entry={entry} />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              {isLoadingWithRows ? (
                <div className="leaderboard-loading-overlay" aria-hidden="true">
                  <LeaderboardSkeleton />
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default LeaderboardPopup;
