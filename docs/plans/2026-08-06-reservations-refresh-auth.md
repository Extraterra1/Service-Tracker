# Reservations Refresh Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task.

**Goal:** Prevent the reservations request from failing during Firebase session restoration on a hard reload.

**Architecture:** `App` owns authentication and access state, so it derives a reservations-readiness boolean and passes it to `ReservationsWorkspace`. The workspace gates its existing request effect on that boolean; changing from false to true triggers the initial request without remounting or losing preserved UI state.

**Tech Stack:** React 19, Firebase Auth, Vitest, Testing Library

---

### Task 1: Cover authentication readiness

**Files:**
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

1. Render `ReservationsWorkspace` with reservation loading disabled.
2. Assert that `fetchReservations` is not called.
3. Rerender with reservation loading enabled.
4. Assert that the reservation data loads.
5. Run the focused test and confirm it fails before implementation.

### Task 2: Gate the reservations request

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/features/reservations/ReservationsWorkspace.jsx`

1. Derive readiness from an authenticated user and allowed access state in `App`.
2. Pass readiness to `ReservationsWorkspace`.
3. Return early from the request effect until readiness is true.
4. Include readiness in the effect dependencies so session restoration triggers loading.
5. Run the focused test, reservations test files, lint, and build.
