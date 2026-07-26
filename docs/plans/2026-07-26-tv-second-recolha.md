# TV Second Recolha Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the second unfinished recolha as a compact right-side `A seguir` entry on the TV board.

**Architecture:** Add a shared selector that returns the first N unfinished services in stable reservation-time order, while preserving the existing single-item selector API. The TV board consumes the first two recolhas and conditionally adds a compact third column containing only time, client, location, and plate.

**Tech Stack:** React, CSS Grid, Vitest, Testing Library, Vite

---

### Task 1: Select the first two unfinished recolhas

**Files:**
- Modify: `src/features/tv/tvBoard.js`
- Test: `src/features/tv/__tests__/tvBoard.test.js`

**Step 1: Write the failing selector test**

Import `selectNextUnfinishedItems` and assert that it returns the first two time-sorted unfinished entries while skipping a completed earlier item.

**Step 2: Verify the test fails**

Run: `npm test -- --run src/features/tv/__tests__/tvBoard.test.js`

Expected: FAIL because `selectNextUnfinishedItems` is not exported.

**Step 3: Implement the selector**

Extract the existing filter and stable sort into `selectNextUnfinishedItems(items, statusMap, limit = 1)`. Return a sliced array and implement `selectNextUnfinished` as the first result or `null`.

**Step 4: Verify the selector test passes**

Run: `npm test -- --run src/features/tv/__tests__/tvBoard.test.js`

Expected: PASS.

### Task 2: Render the compact second recolha

**Files:**
- Modify: `src/features/tv/TvOperationsBoard.jsx`
- Test: `src/features/tv/__tests__/TvOperationsBoard.test.jsx`

**Step 1: Write failing component tests**

Render three recolhas with one completed. Assert the primary region contains the earliest unfinished recolha and the `Recolha a seguir` complementary region contains only `A seguir`, reservation time, uppercase client name, location, and plate. Add a test that the complementary region is absent with one unfinished recolha.

**Step 2: Verify the tests fail**

Run: `npm test -- --run src/features/tv/__tests__/TvOperationsBoard.test.jsx`

Expected: FAIL because the secondary recolha is not rendered.

**Step 3: Implement the compact entry**

Consume `selectNextUnfinishedItems(..., 2)`, render the second item in a `tv-board-next-return` element with an accessible label, and add `has-secondary` only when the second item exists. Use reservation time only.

**Step 4: Verify component tests pass**

Run: `npm test -- --run src/features/tv/__tests__/TvOperationsBoard.test.jsx`

Expected: PASS.

### Task 3: Fit and verify the TV layout

**Files:**
- Modify: `src/App.css`
- Test: `src/features/tv/__tests__/tvBoardStyles.test.js`

**Step 1: Write the failing style contract**

Assert that the recolha service row uses a third column only with `has-secondary`, that the secondary entry has no card decoration, and that narrow-aspect layouts stack it.

**Step 2: Verify the style test fails**

Run: `npm test -- --run src/features/tv/__tests__/tvBoardStyles.test.js`

Expected: FAIL because the secondary selectors do not exist.

**Step 3: Implement compact styles**

Add the conditional grid, restrained type scale, truncation-safe wrapping, and narrow-aspect stack. Preserve the JustDrive palette and main recolha sizes.

**Step 4: Verify and integrate**

Run the TV test directory and changed-file lint. Inspect the page at 961 × 541 for overlap and overflow. Run the full suite while recording the approved unrelated reservation baseline failure, then run `npm run build` and `git diff --check`. Commit, merge to `master`, verify again, and remove the worktree.

