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

### Task 4: Order route and vehicle data

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Add failing assertions for the exact Percurso and Viatura label order.

**Step 2:** Reorder the route field definitions and combine brand plus model into the Modelo value.

**Step 3:** Keep Marca recognized as a known field so it does not reappear under additional information.

**Step 4:** Run focused tests, ESLint, and the production build.

### Task 5: Separate extras and flag missing IMT

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Modify: `src/App.css`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Add failing tests for Grupo/Matrícula/Modelo order, an Extras pill section, notes without the Extras block, and the missing-IMT header pill.

**Step 2:** Parse `Extras:`, `Notas Cliente:`, and `Notas Serviço:` markers from delivery comments while preserving unstructured comments as notes.

**Step 3:** Render extras in a dedicated pill list and the parsed notes in the existing Notas section.

**Step 4:** Detect `/imt/i` across parsed extras and render “Não tem taxa IMT” only when no match exists.

**Step 5:** Run both popup suites, ESLint, the production build, and `git diff --check`.

### Task 6: Stabilize the details grid

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Add a sparse-reservation test asserting the eight fixed core sections and placeholders.

**Step 2:** Assert Viatura uses Modelo, Matrícula, Grupo order.

**Step 3:** Stop filtering absent core fields; format missing values as an em dash.

**Step 4:** Always render Extras and Notas with dedicated empty messages while keeping Informação adicional conditional.

**Step 5:** Run shared popup tests, ESLint, build, and `git diff --check`.

### Task 7: Demote Reserva to the final grid slot

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Change the fixed-layout expectation to Cliente, Condutor, Percurso, Viatura, Comercial, Extras, Notas, Reserva.

**Step 2:** Reorder the core group definitions without changing field behavior.

**Step 3:** Run shared popup tests, ESLint, build, and `git diff --check`.

### Task 8: Link client phones to WhatsApp

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Modify: `src/App.css`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Add a failing assertion for the normalized `wa.me` URL, accessible label, and new-tab behavior.

**Step 2:** Reuse `getWhatsAppHref`; render valid numbers as an icon-enhanced link and invalid values as plain text.

**Step 3:** Run shared popup tests, ESLint, build, and `git diff --check`.
