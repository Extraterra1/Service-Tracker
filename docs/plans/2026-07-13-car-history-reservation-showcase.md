# Car History Reservation Showcase Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make reservation numbers in vehicle history open the existing reservation showcase without closing vehicle history.

**Architecture:** Add an event callback to `CarHistoryPopup` and keep the selected reservation reference in `App`. Render `ServiceReservationPopup` at the app overlay level so the history component stays mounted and reservation loading remains centralized in the existing showcase adapter.

**Tech Stack:** React, Vitest, Testing Library, CSS

---

### Task 1: Specify reservation activation in vehicle history

**Files:**
- Modify: `src/components/__tests__/CarHistoryPopup.test.jsx`
- Modify: `src/components/CarHistoryPopup.jsx`
- Modify: `src/App.css`

**Step 1: Write the failing test**

Add `onOpenReservation: vi.fn()` to the fixture, select a plate, click the button named `Ver detalhes da reserva RES-001`, and assert that the callback receives `RES-001`.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/components/__tests__/CarHistoryPopup.test.jsx`

Expected: FAIL because the reservation reference is not a button and the callback is not invoked.

**Step 3: Write the minimal implementation**

Accept `onOpenReservation`, render non-empty references as `type="button"` controls with a descriptive `aria-label`, and invoke the callback with the exact reference. Add hover and focus-visible styling without changing the existing layout.

**Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/components/__tests__/CarHistoryPopup.test.jsx`

Expected: PASS.

### Task 2: Stack the existing showcase above vehicle history

**Files:**
- Modify: `src/App.jsx`
- Modify: the closest existing App integration test covering history overlays

**Step 1: Write the failing integration test**

Open vehicle history, activate a reservation reference, and assert that the reservation loading/showcase dialog appears while `Histórico de viaturas` remains mounted. Close reservation details and assert that history remains visible.

**Step 2: Run the focused integration test to verify it fails**

Run the narrowest Vitest file containing the new assertion.

Expected: FAIL because `App` does not yet own or render a history-selected reservation.

**Step 3: Write the minimal implementation**

Lazy-load or import `ServiceReservationPopup`, add selected-reference state and open/close callbacks in `App`, pass the opener to `CarHistoryPopup`, and conditionally render the reservation popup after the history overlay.

**Step 4: Run the focused integration tests**

Expected: PASS.

### Task 3: Verify the scoped change

**Files:**
- Verify all modified source, test, style, and plan files

**Step 1: Run focused tests**

Run the vehicle-history and relevant App integration tests.

**Step 2: Run the full suite**

Run: `npm test`

Expected: all tests pass.

**Step 3: Run static checks**

Run the repository lint/build commands exposed by `package.json`, followed by `git diff --check`.

Expected: zero errors.

**Step 4: Review the diff**

Confirm the history popup remains mounted, the existing reservation showcase is reused, unrelated user changes are untouched, and the interaction is keyboard accessible.

### Task 4: Match the main-list reservation icon

**Files:**
- Modify: `src/components/CarHistoryPopup.jsx`
- Modify: `src/components/__tests__/CarHistoryPopup.test.jsx`

**Step 1: Write the failing test**

Assert that the vehicle-history reservation button contains a Lucide eye icon with the shared `item-reservation-link-icon` class and `aria-hidden="true"`.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/components/__tests__/CarHistoryPopup.test.jsx`

Expected: FAIL because the button does not yet render the eye icon.

**Step 3: Write the minimal implementation**

Import `Eye` from `lucide-react` and render `<Eye className="item-reservation-link-icon" aria-hidden="true" />` after the reservation reference.

**Step 4: Run focused and full verification**

Run the vehicle-history test, production build, and full suite. Expected: the focused test and build pass; report any unrelated failures from the existing current-flights work separately.
