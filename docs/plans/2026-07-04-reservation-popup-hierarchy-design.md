# Reservation Popup Hierarchy Design

## Goal

Remove duplicated reservation information and place status and the legacy-system action where they are most useful.

## Layout

The header keeps the reservation reference as the single visible ID and places the formatted status pill immediately beside it. The Reserva section no longer repeats the reference or status, but continues to show origin when available.

The “Ver no Reservations” action sits on the right side of the header, immediately before the close control. It keeps its text label and adds an external-link icon so the destination behavior is explicit without relying on the icon alone.

When status is absent, the header renders no empty pill. Existing status formatting, colors, responsive layout, close behavior, and legacy URL construction remain unchanged.

## Testing

Verify the reference appears once, the status appears in the header as a pill, the Reserva section omits ID and Estado, and the legacy link is contained by the Cliente section.
