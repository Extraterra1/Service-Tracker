# Flight Link Pointer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a pointer cursor when hovering a flight number linked to FlightRadar24.

**Architecture:** Keep the existing link markup and add the cursor declaration to its dedicated CSS selector. Protect the behavior with a source-level CSS regression test.

**Tech Stack:** CSS, Vitest

---

### Task 1: Add the linked-flight cursor cue

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/App.css`

**Step 1: Write the failing test**

Read `src/App.css` in the flight workspace test and assert that `.flight-number-link` contains `cursor: pointer`.

**Step 2: Verify the test fails**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`

Expected: FAIL because the selector currently has no cursor declaration.

**Step 3: Implement the minimal fix**

Add `cursor: pointer;` to `.flight-number-link` in `src/App.css`.

**Step 4: Verify the fix**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx && npm run build && git diff --check`

Expected: tests pass, build succeeds, and the diff is clean.
