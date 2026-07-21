# TV Warm-Light Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle `#tv` as a warm-light board that fits a 961×541 viewport without overflow.

**Architecture:** Keep the React structure and data flow unchanged. Update only scoped TV CSS tokens and add a compact landscape breakpoint, protected by source-level style regression tests and browser viewport verification.

**Tech Stack:** React, CSS, Vitest, Vite, in-app browser viewport testing.

---

### Task 1: Specify the warm-light palette and compact viewport behavior

**Files:**
- Create: `src/features/tv/__tests__/tvBoardStyles.test.js`

1. Add failing assertions that the TV board defines ivory/charcoal palette tokens and a compact landscape media query covering 961×541.
2. Run `npm test -- --run src/features/tv/__tests__/tvBoardStyles.test.js` and confirm failure.

### Task 2: Implement the scoped TV CSS refinement

**Files:**
- Modify: `src/App.css`

1. Replace the dark TV colors with warm-light tokens and surfaces.
2. Add a compact landscape breakpoint that preserves the two-column board while reducing gaps and type minima.
3. Run the focused TV style and component tests.

### Task 3: Verify and merge

**Files:**
- Review: `src/App.css`

1. Inspect `#tv` at exactly 961×541 and verify document bounds equal viewport bounds.
2. Run the full test suite, changed-file lint, and production build.
3. Commit, merge into `master`, and rerun tests on the merged result.
