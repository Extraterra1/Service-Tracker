# Reservations Workspace Delight Design

## Goal

Turn the reservations workspace into a fast, mobile-friendly operations list that shows the latest ten reservations first, exposes only essential scan fields, and reveals the complete booking record on demand.

## Experience

The first request fetches ten reservations. Search and status filters retain server-side pagination, with 10, 25, 50, and 100 row choices. Each reservation appears as a compact, keyboard-accessible row showing only the client name, stored country flag, status, pickup date and time, dropoff date and time, car group, and license plate.

Selecting a row opens an accessible popup. The popup groups all available booking information into client, journey, vehicle, commercial, and notes sections. Known fields receive Portuguese labels, while any additional API fields are included in a supplementary section so information returned by the booking service is not silently discarded.

## Loading and feedback

Initial loading and subsequent search, filter, retry, and pagination requests render ten structural skeleton rows. The skeletons preserve the final list geometry and provide an `aria-busy` state without announcing decorative placeholders. Existing content is replaced during a request so stale reservations cannot be mistaken for current results.

Rows use restrained hover, press, and focus feedback. The popup uses a short opacity and transform transition, supports Escape and backdrop dismissal, restores focus to its trigger, and respects reduced-motion preferences.

## Responsive behavior

Desktop uses a dense aligned grid. On narrow screens, the same item becomes a compact two-column composition with the client identity spanning the row and pickup/dropoff information remaining easy to compare. No horizontal table scrolling is required.

## Data handling

The stored country field is the source of truth for the flag. Two-letter ISO values render directly; recognized country names are normalized when practical. Missing or unrecognized country data receives an accessible neutral fallback rather than a guessed flag.

## Verification

Component tests cover the ten-row initial request, visible field restrictions, stored-country rendering, popup completeness, pointer and keyboard activation, popup dismissal, pagination, and loading skeletons. The focused test suite, lint, and production build run before completion.
