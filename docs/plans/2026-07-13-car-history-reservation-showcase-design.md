# Car History Reservation Showcase Design

## Goal

Open the existing reservation showcase when a reservation number is selected in **Histórico de Viaturas**, while preserving the history popup underneath.

## Design

`CarHistoryPopup` will render each non-empty reservation reference as an accessible button and report selections through an `onOpenReservation` callback. `App` will own the selected reservation reference so the history popup remains mounted with its current plate, date window, and scroll state.

`App` will render the existing `ServiceReservationPopup` above the history popup. This reuses the established reservation-detail fetch, loading, retry, cache, permission, and showcase behavior instead of duplicating reservation logic in the history component. Closing the reservation showcase will clear only the selected reservation reference and reveal the unchanged history popup.

## Interaction and accessibility

The reservation number will retain its compact visual treatment while gaining button semantics, a descriptive accessible name, visible hover/focus feedback, and the same Lucide eye icon used by reservation actions in the main service list. Empty reservation references will remain non-interactive.

## Testing

Component coverage will verify that selecting a reservation number calls the callback with the exact reference. App-level coverage will verify that the reservation showcase opens above the still-mounted history dialog and that closing it returns to the preserved history view.
