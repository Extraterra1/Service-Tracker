# Mobile Flight Client Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show compact WhatsApp and reservation actions in mobile current-flight client rows.

**Architecture:** Reuse the existing semantic links and mobile client grid. Change only breakpoint-specific CSS so actions occupy the top-right cell, active WhatsApp phone text is visually hidden, and the car details continue below.

**Tech Stack:** React, CSS, Vitest

---

### Task 1: Add a mobile CSS regression test

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`

**Step 1: Write the failing test**

Read `src/App.css` and assert that the current-flight mobile rules display `.flight-client-actions`, place it in grid column two and row one, and hide the span inside active `.flight-client-phone` links.

**Step 2: Verify the test fails**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx --run`

Expected: FAIL because the current mobile rule sets the action group to `display: none`.

### Task 2: Restore compact mobile actions

**Files:**
- Modify: `src/App.css`

**Step 1: Implement the approved layout**

Keep the client identity in column one on mobile. Display `.flight-client-actions` as a compact horizontal group in column two, row one. Hide only the visible phone-number span for active WhatsApp links and retain the reservation number and icon.

**Step 2: Verify the focused test passes**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx --run`

Expected: PASS.

### Task 3: Verify the flight feature

**Files:**
- Verify: `src/features/flights/`

**Step 1:** Run `npm test -- src/features/flights --run`.

**Step 2:** Run scoped ESLint for touched flight test/component files.

**Step 3:** Run `npm run build` and `git diff --check`.

Expected: all commands succeed.
