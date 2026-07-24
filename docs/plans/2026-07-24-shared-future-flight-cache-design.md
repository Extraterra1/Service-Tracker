# Shared Future Flight Cache Design

## Goal

Share future-flight results across approved users and avoid repeated external requests until the cached result is 24 hours old, the requested flight set changes, or a user manually overrides the cache.

## Storage and freshness

Use a separate Firestore document per arrival date at `future_flight_cache/{YYYY-MM-DD}`. Each document stores the date, normalized sorted flight-number set, normalized API results, source identifier, server `cachedAt`, and updating user UID. A matching document is fresh for 24 hours. A missing document, stale timestamp, or any change to the normalized flight-number set requires a refresh.

The future cache remains separate from `flight_status_cache`, whose FR24 current-day results have a five-minute lifetime and a different payload shape. A small in-memory mirror lets remounts render immediately before Firestore responds, while the Firestore subscription shares updates between devices and users.

## Refresh coordination

Use `future_flight_refresh_locks/{date}` for a 45-second client-coordinated lease. Automatic refresh checks the cache, then attempts the lease before calling the external API. This prevents multiple users opening the same stale date from issuing duplicate requests. A manual refresh button bypasses freshness and the lease, matching the explicit override requested by the user.

On success, update the screen immediately and save to Firestore best-effort. A cache-write failure must not hide valid external results. A read failure falls back to in-memory/direct fetching. If refresh fails while cached results exist, preserve them and show compact non-blocking feedback; use the blocking error state only when no usable results exist.

## Security

Active approved staff may read and write the future cache and lease documents. Rules require an exact allowlisted field set, matching valid date, normalized-list size bounds, the expected future-flight source string, authenticated updater/owner UID, timestamps, and no deletes. Future dates deliberately do not use the current-service-date constraint.

## UI and verification

Add a compact refresh button to the future-flight header and show `A atualizar…` while a fetch is active. Tests cover 24-hour freshness, normalized set matching, subscription/persistence, lease behavior, immediate cached rendering, changed-flight invalidation, stale refresh, manual override, graceful persistence/read failure, rules validation, and current-day regression safety. Deploy Firestore rules before releasing the frontend.
