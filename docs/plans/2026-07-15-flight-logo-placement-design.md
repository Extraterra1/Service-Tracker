# Flight Logo Placement Design

## Goal

Keep the plane icon as the stable left-hand route marker and show the airline logo directly to the right of the flight number.

## Design

The flight identity remains a two-column grid. The first column always contains the landing-plane icon. The second column contains a compact flex row with the flight number followed by the airline logo, with the `FNC` label on the row beneath it.

Flights without a recognized airline keep the same layout but omit the logo. The time and status columns are unchanged, preserving their existing desktop and mobile alignment.

## Testing

Extend the flight workspace regression test to verify that a recognized flight renders both the plane marker and airline logo, and that the logo shares a wrapper with the flight-number link.
