# TV Nunito Typography Design

## Goal

Replace Sora/Urbanist on `#tv` with locally bundled Nunito so the board feels warmer, rounder, and less generically geometric without affecting the rest of Service Tracker.

## Treatment

- Use Nunito across the TV board only.
- Use a variable local webfont so all required weights come from one bundled family.
- Keep heavy, tabular times as the primary anchor.
- Use semibold client/location text and bold compact labels.
- Preserve the existing warm-light palette, hierarchy, and 961×541 layout.
- Retain a system sans fallback if the font asset cannot load.

## Verification

Assert the local font import and TV-only family in tests. Inspect the computed font and page bounds at 961×541, then run full tests, changed-file lint, and production build.
