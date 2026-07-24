# Future Client Identity Spacing Design

## Goal

Restore breathing room between the future client flag and the left border without moving reservation `Hora` out of alignment with `Programado`.

## Design

Apply left padding only to `.flight-client-identity` inside the future time-aligned client row. Do not pad the full subgrid row because that would shift the inherited time column. At the existing 700px breakpoint, reset the identity padding to zero because the mobile client box already supplies horizontal padding.

## Verification

Extend the existing CSS regression test to require the scoped desktop padding and mobile reset while preserving all time-alignment assertions. Run focused flight tests, full tests, lint, build, and diff checks before release.
