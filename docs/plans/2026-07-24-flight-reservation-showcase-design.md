# Flight Reservation Showcase Design

## Goal

Open the existing in-app reservation showcase when a user selects a reservation from either Flights view, instead of opening the legacy reservations backend.

## Design

`App` already owns the reservation-showcase state and renders `ServiceReservationPopup` above the active workspace. It will pass its existing open handler into both the current-flights and future-flights workspaces. `FlightResult` and `FlightClient` will forward that handler to the reservation action.

The reservation action will be a button whenever the client has a reservation reference. Selecting it will call the handler with that reference and leave the Flights workspace mounted beneath the modal. Missing references remain disabled; the legacy `reservationUrl` is no longer used for this action.

## Verification

Component tests will first prove that the current backend link behavior fails the new requirement, then verify the callback and reference propagation through both Flights workspace variants. The focused test files and production build will be run after implementation.
