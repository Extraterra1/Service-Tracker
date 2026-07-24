# Future Flight Row Simplification Design

## Goal

Simplify `Voos futuros` so every flight is presented as scheduled and each client row includes the reservation time.

## Design

The future-flight workspace continues to use the existing flight API response, grouping, and sorting. Its presentation will show only the scheduled arrival field, labelled `Programado`, and its status will always read `Programado`. Estimated and actual arrival values remain available internally but are not rendered in this future-only view.

Each client row gains a `Hora` detail sourced from the service item's existing `time` field. Missing or malformed times render with the existing safe placeholder `--:--`. The loading skeleton is reduced to one flight-time placeholder and gains one client-detail placeholder so its shape matches the finished row.

Current-day `Voos`, including live statuses and its single live-arrival time, remains unchanged.

## Verification

Component tests will assert that a future row renders only `Programado`, hides `Estimado` and `Real`, ignores a returned non-scheduled status for display, and shows each reservation time in its client row. Skeleton tests will assert one future-flight time placeholder and the added client detail. Run focused flight tests, lint, the full frontend test suite, and the production build.
