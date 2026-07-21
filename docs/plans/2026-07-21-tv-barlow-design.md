# TV Barlow Typography Design

## Goal

Replace Nunito on the hidden `#tv` operations board with Barlow Variable, giving the display a squarer, more signage-like character while preserving fast reading at 961 × 541.

## Design

- Use Barlow Variable only within the lazy-loaded TV workspace.
- Keep the existing hierarchy, warm light palette, spacing, uppercase client names, and tabular time figures.
- Use the normal-width variable face rather than a condensed variant so names remain comfortable to scan from across a room.
- Retain a system sans-serif fallback for resilient rendering.
- Load the font locally through Fontsource; no remote font request is introduced.

## Verification

- Regression tests assert the TV-only Barlow import and font stack.
- Browser inspection at 961 × 541 confirms Barlow is loaded and the board has no horizontal or vertical overflow.
- Run the TV tests, changed-file lint, full test suite, and production build.

