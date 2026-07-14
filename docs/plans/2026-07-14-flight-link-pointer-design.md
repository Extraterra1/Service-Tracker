# Flight Link Pointer — Design

## Goal

Make linked flight numbers visibly behave like clickable controls when hovered with a pointer.

## Design

Add `cursor: pointer` to the existing `.flight-number-link` selector. This scopes the interaction cue to flight numbers that actually have a FlightRadar24 URL; plain, non-linked flight numbers retain their current cursor.

## Testing

Add a CSS regression assertion for the link selector, confirm it fails before the style is added, then run the focused flight workspace suite and production build.
