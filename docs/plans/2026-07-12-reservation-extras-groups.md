# Reservation Extras Groups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split reservation showcase extras into Contrato and Outros, with contract extras in a fixed business order.

**Architecture:** Normalize each extra label for matching while preserving its original display text. Partition recognized contract extras by ranked category and render all remaining extras in their source order.

**Tech Stack:** React, Vitest, Testing Library, CSS

---

### Task 1: Group reservation extras

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Modify: `src/App.css`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Add a failing UI test with shuffled contract extras and an unrelated extra.

**Step 2:** Run the focused test and confirm it fails because subgroup headings are absent.

**Step 3:** Add normalized matching, fixed Contrato ordering, Outros partitioning, and subgroup markup/styles.

**Step 4:** Run the focused reservation tests and then the full test suite.

### Task 2: Recognize all baby seat labels

**Files:**
- Modify: `src/features/reservations/ReservationDetailsPopup.jsx`
- Test: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1:** Extend the grouping test with Maxi-Cosi, Grupo I, Grupo II, and Assento Elevatório.

**Step 2:** Run the focused test and confirm those labels incorrectly appear under Outros.

**Step 3:** Expand normalized Baby Seat matching to cover the additional labels and numeric group variants.

**Step 4:** Run the focused test and full suite.
