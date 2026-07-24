# Future Client Time Alignment Design

## Goal

Keep reservation `Hora` inside each future-flight client box while aligning it horizontally with the `Programado` flight time above.

## Design

The future client container will inherit the parent flight row's column tracks through CSS subgrid. Each client row will place identity in the flight-identity column and `Hora` in the flight-time column, guaranteeing that their horizontal starting edges match at every desktop width. Car, matrícula, WhatsApp, and reservation actions will be grouped in the remaining columns so their existing behavior is preserved.

This alignment modifier applies only to future-flight rows. Current-day flight rows retain their existing structure. Below the existing 700px breakpoint, the aligned row returns to a compact two-column client layout so the desktop column relationship does not force narrow or overflowing mobile content.

## Verification

Component tests will assert the future client container and `Hora` receive the alignment hooks while current-day clients do not. CSS regression assertions will require subgrid on desktop, `Hora` in the second inherited column, and the compact non-subgrid layout at the mobile breakpoint. Focused flight tests, full tests, lint, build, and diff checks run before release.
