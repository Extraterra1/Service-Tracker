# Flight Reservation Showcase Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make reservation actions in both Flights views open the existing in-app reservation showcase instead of the legacy backend.

**Architecture:** Reuse the reservation popup state already owned by `App`. Thread its open callback through `FlightsAccessWorkspace`, `CurrentFlightsWorkspace`, `FlightsWorkspace`, `FlightResult`, and `FlightClient`; render the reservation action as a button keyed by the client reservation reference.

**Tech Stack:** React, Vitest, Testing Library, Vite

---

### Task 1: Define the flight-client interaction

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`

**Step 1: Write the failing tests**

Update the future-flights assertion to expect a button named `Reservations 1002`, click it, and assert `onOpenReservation('1002')`. Add the equivalent callback assertion for the current-flights workspace.

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`

Expected: FAIL because the reservation control is still an external link and the callback is not wired.

### Task 2: Wire the existing showcase into Flights

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/features/flights/CurrentFlightsWorkspace.jsx`
- Modify: `src/App.jsx`

**Step 1: Implement the minimal callback path**

Accept `onOpenReservation` in each flight component, forward it to `FlightClient`, and replace the external anchor with a button that calls `onOpenReservation(reservationId)`. Pass `handleOpenCarHistoryReservation` from `App` into both Flights workspaces.

**Step 2: Run focused tests to verify they pass**

Run: `npm test -- --run src/features/flights/__tests__/FlightsWorkspace.test.jsx src/features/flights/__tests__/CurrentFlightsWorkspace.test.jsx`

Expected: PASS.

### Task 3: Verify the integration

**Files:**
- Verify: `src/App.jsx`
- Verify: `src/features/flights/FlightsWorkspace.jsx`
- Verify: `src/features/flights/CurrentFlightsWorkspace.jsx`

**Step 1: Run the relevant broader tests**

Run: `npm test -- --run src/features/flights src/components/__tests__/ServiceItemCard.locationLink.test.jsx`

Expected: PASS.

**Step 2: Build the application**

Run: `npm run build`

Expected: PASS with a successful Vite production build.
