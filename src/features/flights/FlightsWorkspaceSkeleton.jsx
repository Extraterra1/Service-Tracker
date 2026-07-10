const SKELETON_ROWS = 4

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
          <article className="flight-skeleton-row" data-testid="flight-skeleton-row" key={index}>
            <span className="flights-skeleton-block flight-skeleton-number" />
            <div className="flight-skeleton-times">
              <span className="flights-skeleton-block" />
              <span className="flights-skeleton-block" />
              <span className="flights-skeleton-block" />
            </div>
            <span className="flights-skeleton-block flight-skeleton-status" />
          </article>
        ))}
      </div>
    </section>
  )
}

export default FlightsWorkspaceSkeleton
