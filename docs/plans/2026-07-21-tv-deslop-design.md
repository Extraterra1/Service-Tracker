# TV Board Deslop Refinement Design

## Goal

Make `#tv` feel like a calm operational display rather than a styled dashboard, while preserving its warm-light palette, service hierarchy, and 961×541 target.

## Changes

- Remove the decorative red side stripe completely.
- Remove the ornamental `01` and `02` numbering.
- Keep red only for operational meaning, specifically the live flight-time source.
- Separate Entrega and Recolha with a quiet one-pixel rule and warm neutral surface change.
- Align section label, time, and service details on one restrained grid.
- Reduce empty-state typography so absence reads as a calm status, not the page protagonist.
- Preserve the delivery's dominant time, secondary recolha hierarchy, realtime data, and chrome-free route.

## Verification

Add component assertions that decorative indices are absent and CSS assertions that no thick side accent remains. Inspect populated and empty states at 961×541, confirm zero overflow, then run full tests, changed-file lint, and build.
