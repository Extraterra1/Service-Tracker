# Horizontal Flight Client Actions Design

## Goal

Align each flight client's phone and reservation controls horizontally in both current and future Flights views.

## Design

The shared `.flight-client-actions` container will remain flex-based but use a horizontal row at every viewport size. The phone stays on the left and the reservation number stays on the right through `justify-content: space-between`. Existing mobile overrides remain intact, including the compact icon-only phone treatment in today's Flights view.

## Verification

Update the shared CSS regression assertion to require the horizontal direction and left/right distribution. Run the current-flight and future-flight component tests, then build the application.
