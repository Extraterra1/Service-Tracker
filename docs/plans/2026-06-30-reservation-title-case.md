# Reservation Title Case Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Title-case selected reservation display fields without mutating booking data.

**Architecture:** Add a pure display helper beside the reservations feature and consume it from the compact row and detail popup. Keep status codes and source values untouched.

**Tech Stack:** React 19, Vitest, Testing Library.

---

### Task 1: Specify title-cased reservation fields

**Files:**
- Modify: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

1. Change fixture values to lowercase and assert the row displays `C` and `Confirmada`.
2. Open the details popup and assert `Aeroporto`, `Sede`, and `Confirmada` appear.
3. Run the focused test and verify it fails for the lowercase group, locations, and raw status code.

### Task 2: Add presentation formatting

**Files:**
- Create: `src/features/reservations/reservationDisplay.js`
- Modify: `src/features/reservations/ReservationsWorkspace.jsx`
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`

1. Implement a locale-aware title-case helper and status-label formatter.
2. Apply them only to car group, station, and status display values.
3. Run the focused test and verify it passes.

### Task 3: Verify and integrate

1. Run focused tests, the full test suite, changed-file lint, and the production build.
2. Review `git diff --check` and commit the scoped change.
3. Merge into `master` and push after the merged tests pass.
