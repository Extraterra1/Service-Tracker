const SKELETON_ROWS = 4
const TIME_LABELS = ['Programado', 'Estimado', 'Real']

function FlightsWorkspaceSkeleton({ label = 'A carregar voos' }) {
  return (
    <section className="flights-skeleton" role="status" aria-label={label} data-testid="flights-loading-skeleton">
      <span className="sr-only">{label}</span>
      <div className="flights-skeleton-rule" aria-hidden="true">
        <span className="flights-skeleton-block flights-skeleton-rule-label" />
        <span className="flights-skeleton-block flights-skeleton-rule-label" />
      </div>
      <div className="flights-skeleton-list" aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <article
            className="flight-skeleton-row"
            data-testid="flight-skeleton-row"
            key={index}
            style={{ '--skeleton-delay': `${index * 100}ms` }}
          >
            <div className="flight-skeleton-identity" data-testid="flight-skeleton-identity">
              <span className="flights-skeleton-block flight-skeleton-route" />
              <span className="flights-skeleton-block flight-skeleton-number" />
              <span className="flights-skeleton-block flight-skeleton-airport" />
            </div>
            <div className="flight-skeleton-times">
              {TIME_LABELS.map((timeLabel) => (
                <div className="flight-skeleton-time" data-testid="flight-skeleton-time" key={timeLabel}>
                  <span className="flight-skeleton-time-label">{timeLabel}</span>
                  <span className="flights-skeleton-block flight-skeleton-time-value" />
                </div>
              ))}
            </div>
            <span className="flights-skeleton-block flight-skeleton-status" data-testid="flight-skeleton-status" />
            <span className="flights-skeleton-block flight-skeleton-source" data-testid="flight-skeleton-source" />
            <div className="flight-skeleton-client" data-testid="flight-skeleton-client">
              <span className="flights-skeleton-block flight-skeleton-client-label" />
              <span className="flights-skeleton-block flight-skeleton-client-flag" />
              <span className="flights-skeleton-block flight-skeleton-client-name" />
              <span className="flights-skeleton-block flight-skeleton-client-detail" />
              <span className="flights-skeleton-block flight-skeleton-client-detail" />
              <span className="flights-skeleton-block flight-skeleton-client-phone" />
              <span className="flights-skeleton-block flight-skeleton-client-action" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default FlightsWorkspaceSkeleton
