# TV JustDrive Brand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the approved JustDrive palette and top-right logo to the hidden TV operations board.

**Architecture:** Reuse the existing local SVG asset from `src/assets/Logo Base.svg`, render it inside the TV board, and scope all palette changes to existing `.tv-board` selectors. Preserve the board's data flow and hierarchy.

**Tech Stack:** React, CSS, SVG asset imports, Vitest, Testing Library, Vite

---

### Task 1: Specify the branded TV contract

**Files:**
- Modify: `src/features/tv/__tests__/TvOperationsBoard.test.jsx`
- Modify: `src/features/tv/__tests__/tvBoardStyles.test.js`

**Step 1: Add failing tests**

Assert that the board renders the JustDrive logo with descriptive alt text. Assert the scoped CSS contains the approved pale blush, warm-gray secondary field, JustDrive red label treatment, and top-right logo positioning.

**Step 2: Verify failure**

Run: `npm test -- --run src/features/tv/__tests__/TvOperationsBoard.test.jsx src/features/tv/__tests__/tvBoardStyles.test.js`

Expected: FAIL because the board has no logo and still uses the previous warm palette.

### Task 2: Implement the brand treatment

**Files:**
- Modify: `src/features/tv/TvOperationsBoard.jsx`
- Modify: `src/App.css`

**Step 1: Reuse the logo asset**

Import `../../assets/Logo Base.svg`, render it at board level for normal and loading states, and give it the existing descriptive alternative text.

**Step 2: Apply scoped palette and placement**

Update only TV color tokens and backgrounds. Position the logo at the top-right, size it for the target viewport, and preserve the current service grid.

**Step 3: Verify focused behavior**

Run the two changed tests plus the full TV test directory, then lint the changed JavaScript files.

### Task 3: Validate and integrate

**Files:**
- No additional production files expected.

**Step 1: Inspect 961 × 541**

Confirm the logo is visible and clear of content, the computed palette matches the approved colors, and document dimensions equal the viewport.

**Step 2: Run complete verification**

Run: `npm test -- --run`

Run: `npm run build`

Run: `git diff --check`

**Step 3: Commit and merge**

Commit the brand pass, merge `codex/tv-justdrive-brand` into `master`, rerun the full suite and build, then remove the temporary worktree and branch.

