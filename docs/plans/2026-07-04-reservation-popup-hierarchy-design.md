# Reservation Popup Hierarchy Design

## Goal

Remove duplicated reservation information and place status and the legacy-system action where they are most useful.

## Layout

The header keeps the reservation reference as the single visible ID and places the formatted status pill immediately beside it. The Reserva section no longer repeats the reference or status, but continues to show origin when available.

The full-width “Ver no Reservations” action moves to the bottom of the Cliente section. This keeps the external navigation action in the first content section without competing with the reservation metadata.

When status is absent, the header renders no empty pill. Existing status formatting, colors, responsive layout, close behavior, and legacy URL construction remain unchanged.

## Testing

Verify the reference appears once, the status appears in the header as a pill, the Reserva section omits ID and Estado, and the legacy link is contained by the Cliente section.
