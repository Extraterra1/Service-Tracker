# Leaderboard Winner Banner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a small `Winner!` ribbon on the first-place leaderboard podium card only when browsing previous weeks or months.

**Architecture:** Reuse the existing historical-period signal already exposed to the popup through `canNavigateForward`. Keep the behavior local to `LeaderboardPopup` and style it in `App.css`, with tests proving the banner only appears on completed historical periods.

**Tech Stack:** React 19, Vite, Vitest, Testing Library

---

### Task 1: Add failing popup coverage for the winner ribbon

**Files:**
- Modify: `src/components/__tests__/LeaderboardPopup.test.jsx`
- Modify: `src/components/LeaderboardPopup.jsx`
- Modify: `src/App.css`

**Step 1: Write the failing test**

Add tests that:
- expect `Winner!` on the first-place card when `period` is `weekly` or `monthly` and `canNavigateForward` is true
- expect no `Winner!` banner when `canNavigateForward` is false
- expect no `Winner!` banner for `all_time`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx`
Expected: FAIL because the podium currently has no winner banner.

**Step 3: Write minimal implementation**

Update `LeaderboardPopup.jsx` to:
- derive a historical-period winner state from `period`, `canNavigateForward`, and the presence of a first-place row
- pass that state only to the first-place podium card
- render a compact ribbon element with the text `Winner!`

Add minimal CSS in `src/App.css` for a polished ribbon treatment that fits the current leaderboard palette and spacing.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx`
Expected: PASS

### Task 2: Run focused verification

**Files:**
- Modify: `src/components/LeaderboardPopup.jsx`
- Modify: `src/App.css`
- Modify: `src/components/__tests__/LeaderboardPopup.test.jsx`

**Step 1: Run targeted verification**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
Expected: PASS

**Step 2: Run build verification**

Run: `npm run build`
Expected: PASS
