# Reservation Toolbar and Date-Time Design

## Goal

Align reservation status filters and pagination on one desktop toolbar row, while displaying booking date-times as `dd/mm/yyyy hh:mm` throughout the reservations interface.

## Design

The search field remains the first toolbar row. Filters occupy the left side of the second row and pagination occupies the right side. On narrow screens, the second row wraps naturally so filter buttons and pager controls retain usable tap targets.

Date-time formatting is presentation-only. Valid database values in `yyyy-mm-dd hh:mm:ss` form become `dd/mm/yyyy hh:mm` in both compact reservation items and the detail popup. Missing or malformed values retain the existing fallback behavior rather than producing misleading dates.

## Verification

Component tests cover formatted pickup/dropoff values in the list and popup. CSS contract tests cover shared-row placement and the mobile wrap behavior.
