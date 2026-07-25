# Reservation Creation Date Placement Design

## Layout

Move the existing `Criada em` detail from the `Reserva` field group to the `Cliente` field group, immediately after `Email`. Keep `Origem` in `Reserva`.

## Behavior and data

Reuse the existing `createdAt` value and formatting path. This is a presentation-only grouping change with no fetch, cache, or data-contract changes.

## Verification

Update the reservation popup test to assert the exact client-field order and confirm that `Criada em` no longer appears in the reservation section.
