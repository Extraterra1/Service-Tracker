# Flight Logo Placement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the plane icon on the left and place a recognized airline logo directly after the flight number.

**Architecture:** Preserve the existing two-column flight identity grid. Add a flex wrapper in its second column for the flight-number element and optional airline logo, leaving the destination label below and all outer flight-row columns unchanged.

**Tech Stack:** React, CSS, Vitest, Testing Library

---

### Task 1: Lock the identity layout with a regression test

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`

**Step 1: Write the failing test**

For a recognized TAP flight, assert that the flight card contains the landing-plane marker as well as the TAP logo, and that the logo and flight-number link share the `.flight-number-line` wrapper.

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`

Expected: FAIL because recognized flights currently replace the plane marker with the airline logo.

### Task 2: Implement the approved placement

**Files:**
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/App.css`

**Step 1: Write the minimal implementation**

Always render `.flight-route-mark` in the first identity column. Wrap the existing flight-number link or text and the optional airline image in `.flight-number-line` in the second column. Restore the compact plane column and style the wrapper as a single non-wrapping flex row.

**Step 2: Run the focused test to verify it passes**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`

Expected: PASS.

### Task 3: Verify the flight feature

**Files:**
- Verify: `src/features/flights/`

**Step 1: Run flight tests**

Run: `npm test -- src/features/flights`

Expected: all flight tests pass.

**Step 2: Run scoped lint and production build**

Run the repository lint command for the touched flight files, then `npm run build`.

Expected: both commands succeed without new errors.
