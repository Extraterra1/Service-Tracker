# Integrated Flight Arrivals Design

## Goal

Add a native Service Tracker workspace that shows FlightView arrival information for the selected service day's pickup flights without sending staff to a separate website.

## User flow

- Staff select a day in the existing service workspace.
- A visible `Voos` action opens the flights workspace in the same browser tab.
- The workspace retains the selected service date and automatically looks up that day's pickup flight numbers.
- Staff can return to the service list without losing the selected date.
- The flights workspace uses the same authenticated app shell, theme, responsive behavior, and access gate as the rest of Service Tracker.

## Routing and navigation

Extend the existing hash-based workspace navigation with `#voos`. Unlike the admin-only reservations workspace, the flights workspace is available to every user who can read service data.

The app shell remains mounted while switching workspaces. The selected date continues to live in `App.jsx`, so moving between the service list and flights does not reset it. Browser back and forward navigation must resolve the correct workspace.

## Flight selection and normalization

The source list is the selected day's `pickup` items only. Return-service flight numbers are ignored.

Before lookup, each flight number is:

1. converted to a string;
2. trimmed at both ends;
3. stripped of internal whitespace;
4. converted to uppercase;
5. discarded if empty; and
6. deduplicated after normalization.

This makes values such as ` TP 1685 ` and `TP1685` a single lookup. The original service data is not mutated.

## Backend architecture

Move the reusable FlightView lookup behavior from the Aviability Scraper into the Service Tracker Firebase Functions backend. The browser must not call FlightView directly.

Expose the lookup as an authenticated callable function. It accepts an arrival date, the fixed Madeira airport code `FNC`, and a bounded list of normalized flight numbers. The function verifies Firebase authentication and active staff access before making upstream requests.

The migrated lookup keeps the scraper's important behavior:

- resolve ICAO airline prefixes to IATA prefixes;
- query both the requested date and previous date as possible departure dates;
- match the requested arrival airport and local arrival date;
- return scheduled, estimated, and actual arrival times;
- return a FlightView source URL;
- preserve per-flight `not_found`, `ambiguous_match`, `flightview_unavailable`, and `parse_failed` failures.

The client batches lists above the backend's 20-flight request limit and combines the responses in the original display order. Requests do not use a global busy lock because Firebase Functions may serve independent invocations concurrently.

## Frontend architecture

Add a lazy-loaded `FlightsWorkspace` feature and a small API module for the callable function. The workspace receives the selected date and pickup items from `App.jsx`, derives the normalized flight list, and owns lookup loading, retry, and response state.

The page contains:

- a compact header with the selected date, total flights, and a return-to-services action;
- a loading state while FlightView data is fetched;
- an empty state when the day has no pickup flight numbers;
- an error banner with retry when the whole request fails;
- one result row or card per requested flight;
- status plus scheduled, estimated, and actual times when available; and
- a source link that opens the matching FlightView page in a new tab.

Partial failures remain inline beside their flight number instead of replacing successful results.

The existing external `Aviability Lookup` link is replaced by the native `Voos` workspace action.

## Data freshness

Opening the workspace triggers a lookup for its date and normalized flight list. Changing the selected date or the pickup flight list triggers a new lookup. Obsolete responses are ignored so a slower earlier request cannot replace newer results.

No Firestore persistence is required for the first version. The service-day snapshot remains the source of flight numbers, while FlightView remains the live source of arrival status.

## Error handling

- No pickup flights: render a useful empty state and make no backend call.
- Invalid date or empty batch: reject before upstream lookup.
- Authentication or access failure: return a callable permission error.
- Whole-batch transport failure: show a retryable page-level error.
- Individual flight failure: keep the flight visible with a localized failure message.
- More than 20 flights: split into sequential batches and merge results.
- Stale response: ignore it when the date or flight list has changed.

## Testing

Backend tests cover normalization, authentication/access checks, request validation, previous-day matching, status/time extraction, per-flight failures, and multiple-flight responses.

Frontend tests cover workspace hash resolution, same-tab navigation, pickup-only filtering, whitespace removal, uppercase normalization, deduplication, automatic lookup, batching, empty/loading/error/partial-success states, retry, and stale-response protection.

Existing service and reservation workspace navigation tests must continue to pass.

## Out of scope

- Departures or return-service flights.
- User-entered airport codes.
- Persisting FlightView results in Firestore.
- Background polling or push updates.
- Reusing or embedding the scraper's standalone HTML page.
