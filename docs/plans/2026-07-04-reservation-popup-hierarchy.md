# Reservation Popup Hierarchy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify reservation popup hierarchy by showing the reference once and placing status and the legacy action in the header.

**Architecture:** Adjust `FIELD_GROUPS` and action placement in the existing popup rather than creating new components. Reuse `formatReservationField` and the established `.reservation-status` variants so popup and list statuses stay visually consistent.

**Tech Stack:** React 19, CSS, Vitest, Testing Library

---

### Task 1: Specify the popup hierarchy

**Files:**
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Add assertions that the reference occurs once, status is inside the header, ID and Estado labels are absent, and the legacy link belongs to Cliente.

**Step 2:** Run `npm test -- --run src/features/reservations/__tests__/ReservationsWorkspace.test.jsx` and confirm the new assertions fail.

### Task 2: Implement the hierarchy

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Modify: `src/App.css`

**Step 1:** Remove reference and status from the Reserva field definitions.

**Step 2:** Render a formatted status pill beside the popup title when status exists.

**Step 3:** Place the labeled legacy link with an external-link icon immediately before the close button.

**Step 4:** Add compact header-title layout styles and run the focused test until it passes.

### Task 3: Verify regressions

**Step 1:** Run the reservation and service-workspace popup tests.

**Step 2:** Run ESLint on changed source and test files.

**Step 3:** Run the production build and `git diff --check`.
