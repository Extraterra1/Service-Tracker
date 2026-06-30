# Reservation Title Case Design

## Goal

Display reservation car groups, pickup and dropoff locations, and statuses in title case without changing API or database values.

## Design

Use a small presentation formatter shared by the reservation list and detail popup. It trims values, preserves missing-value handling, uppercases a single-letter car group, and title-cases multi-word values such as pickup and dropoff locations. Existing Portuguese status labels remain the source of truth and are passed through the same display formatter for consistency.

The formatter applies only at render time. Search filters, status codes, API requests, and stored booking records remain unchanged.

## Verification

Component tests verify `c` renders as `C`, lowercase locations render in title case inside the popup, and the visible status label remains title-cased in both list and details.
