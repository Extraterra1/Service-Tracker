# Reservation Prefetch Cache Design

## Goal

Make reservation showcases available immediately from the service list by prefetching their details, persisting successful responses for 24 hours, and refreshing the selected reservation without hiding cached content.

## Architecture

Add a reservation-details cache module that normalizes reservation references, keeps an in-memory view of persisted entries, stores successful responses in `localStorage`, expires entries after 24 hours, and deduplicates in-flight requests. The module will expose cache reads, a single-reference fetch-through operation, and a concurrency-limited prefetch operation.

`ServiceWorkspace` will collect unique reservation references from the current pickup and return lists after renderable service data arrives. It will start a best-effort background prefetch for entries that are missing or expired. Prefetch failures will remain invisible to the service list and will be eligible for a later retry.

`ServiceReservationPopup` will read cached data immediately. Opening the popup will always request fresh details for that reservation: if cached content exists, it remains visible while refreshing; if no cached content exists, the existing loading and retry experience remains. Successful refreshes replace and persist the cached content. Failed refreshes retain cached content.

## Persistence and freshness

- Cache lifetime: 24 hours from the successful response.
- Storage: versioned `localStorage` payload containing reference-keyed entries and timestamps.
- Invalid, unavailable, or malformed storage is treated as an empty cache.
- Reservation references are normalized consistently so leading zeroes do not create duplicate entries.
- Only successful API responses are persisted.
- Prefetch concurrency is bounded to avoid flooding the reservation API.

## Refresh feedback

While cached details are being refreshed, the reservation showcase header will display a compact rotating icon and the text `A atualizar…`. The indicator will use polite live-region semantics, will not block interaction, and will disappear when the request settles. A failed background refresh will leave the cached showcase usable without replacing it with an error screen.

## Testing

Automated tests will cover 24-hour expiry, storage recovery, request deduplication, concurrency-limited prefetching, service-list prefetch initiation, immediate cached popup rendering, background replacement with fresh data, refresh feedback, and cached-content retention after refresh failure.
