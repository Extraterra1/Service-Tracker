# Current Flights Design

## Goal

Replace the Voos construction screen with a current-day FNC arrival overview backed by the FR24-Scraper batch API. Desk staff see normalized flight numbers, live status and arrival time, and every matching pickup client without navigating dates.

## Data flow

Entering Voos resets the shared service date to the Madeira current day. Pickup flight numbers are trimmed, stripped of whitespace, uppercased, and deduplicated. A dedicated current-flight client posts batches of up to 25 flights to FR24-Scraper and converts its UTC timestamps and partial-success results into the board's display model.

Voos Futuros continues using its existing dated batch API and date navigation. Current-day FR24 results are persisted in a shared Firestore day document. Every client subscribes to that cache and renders it immediately. The latest result is also retained in session memory so returning to Voos can paint cached rows synchronously while Firestore reconnects in the background. A two-minute timer checks freshness, but the FR24 API is called only when the shared cache is missing, mismatched, or more than five minutes old. A Firestore lease prevents multiple users refreshing the same stale cache concurrently; Atualizar explicitly refreshes all flights.

## Presentation and lifecycle

The current board reuses the compact operational flight rows and client blocks established by Voos Futuros. Initial loading uses the flight skeleton only when neither session memory nor Firestore has flight data. A successful refresh records its time and exposes a subtle refreshing state.

Arrived flights use the API's selected UTC arrival timestamp. Once that moment is more than one hour old, they move from the main list into a collapsed Anteriores disclosure. Display times are converted to Atlantic/Madeira. A local clock tick reclassifies flights between API refreshes. Unknown or unparseable arrival times remain in the main list.

## Resilience and accessibility

Malformed or missing API configuration produces safe localized feedback. FR24 partial failures remain scoped to their flight, while whole-request failures retain cached data. Firestore rules permit active staff to read and write only validated current-day cache and lease documents. The browser uses `VITE_FR24_API_KEY`; without a server proxy this key is present in the client bundle.

## Verification

Tests cover normalization and API query mapping, concurrent results and partial failure, today-only workspace navigation, client grouping, manual and two-minute refresh, preservation of visible results while refreshing, and one-hour Anteriores classification.
