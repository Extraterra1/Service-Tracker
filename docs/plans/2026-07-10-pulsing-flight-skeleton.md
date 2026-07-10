# Pulsing Flight Skeleton Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flight skeleton shimmer with a simple staggered pulse and make each placeholder resemble a real arrivals row.

**Architecture:** Keep `FlightsWorkspaceSkeleton` as the shared loading component used by both lazy loading and flight-data loading. Add semantic decorative shapes in JSX and control all motion and responsive layout through the existing flight skeleton CSS.

**Tech Stack:** React 19, CSS, Vitest, Testing Library

---

### Task 1: Define the illustrative skeleton contract

**Files:**
- Create: `src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`

**Step 1: Write the failing component tests**

Render the skeleton and assert that every one of its four rows contains a flight identity, three time groups, a status pill, and a source circle. Assert that the rows expose increasing `--skeleton-delay` values.

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`

Expected: FAIL because the detailed placeholders and delay styles do not exist yet.

### Task 2: Implement the row structure and pulse

**Files:**
- Modify: `src/features/flights/FlightsWorkspaceSkeleton.jsx`
- Modify: `src/App.css`

**Step 1: Add the minimal component structure**

Render the flight identity, labelled time groups, status pill, and source circle. Set a row-level CSS custom property to stagger each row by 100 milliseconds.

**Step 2: Replace shimmer with a pulse**

Use a solid ghost fill for blocks and animate each row with `flights-skeleton-pulse 1.4s ease-in-out infinite`. Preserve a static opacity and disable animation under `prefers-reduced-motion: reduce`.

**Step 3: Run the focused tests to verify they pass**

Run: `npx vitest run src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx src/features/flights/__tests__/FlightsWorkspace.test.jsx`

Expected: PASS.

### Task 3: Verify and integrate

**Files:**
- Modify only if verification reveals an issue.

**Step 1: Run all checks**

Run: `npm test && npm run lint && npm run build:perf`

Expected: all non-emulator tests pass, lint exits cleanly, and the production bundle stays within its size budget.

**Step 2: Review the diff and commit**

Confirm only the approved skeleton and plan files changed, then commit the implementation.

**Step 3: Merge into master**

Fast-forward `master` to the verified feature branch and re-run the focused flight tests on `master`.
