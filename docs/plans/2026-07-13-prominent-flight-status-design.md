# Prominent Current Flight Status Design

## Goal

Make live, current-day flight states immediately distinguishable while preserving the compact operational layout.

## Approved treatment

Current-day flight rows use an opt-in semantic status badge in the existing status column. Each badge combines an icon, localized label, tinted background, border, and strong text. Scheduled flights use yellow, airborne flights use blue, arrived flights use green, and exceptional states use red. Unknown states remain neutral.

The treatment applies only to the current-day `Voos` workspace. `Voos Futuros` continues to use the existing compact text status.

## Accessibility and density

Meaning is communicated by text and icon as well as color. The badge keeps the existing row grid and wraps safely on narrow screens, avoiding any extra card or full-row tint.

## Verification

Add a component regression test confirming that current-day rows opt into semantic badges with appropriate accessible labels, then run the focused flight tests and production build.
