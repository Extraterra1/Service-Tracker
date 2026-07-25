# Reservation Creation Date in Client Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display `Criada em` under the reservation popup's `Cliente` section immediately after `Email`.

**Architecture:** Change only the declarative `FIELD_GROUPS` configuration in `ReservationDetailsPopup.jsx`. Keep the existing value formatter and leave `Origem` in the `Reserva` group.

**Tech Stack:** React, Vitest, Testing Library

---

### Task 1: Move the reservation creation field

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1: Write the failing test**

Add assertions that the `Cliente` section terms are exactly `Nome`, `Telefone`, `Email`, and `Criada em`, and that the `Reserva` section contains only `Origem`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

Expected: FAIL because `Criada em` is still in `Reserva`.

**Step 3: Write minimal implementation**

Move `['createdAt', 'Criada em']` from the `Reserva` group's `fields` array to the end of the `Cliente` group's `fields` array.

**Step 4: Run verification**

Run the focused test, ESLint on both changed source/test files, and `npm run build`.

Expected: all commands pass.
