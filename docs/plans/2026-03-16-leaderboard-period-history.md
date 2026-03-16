# Leaderboard Period History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the leaderboard popup browse previous weeks and months while keeping the current week or month as the newest allowed period.

**Architecture:** Keep the change client-side by tracking an anchor date for each leaderboard period. Reuse the existing store API that already derives ranges from `period` and `now`, and extend the hook cache so each historical window is cached independently.

**Tech Stack:** React 19, Vite, Vitest, Testing Library

---

### Task 1: Add failing store and hook coverage for historical periods

**Files:**
- Modify: `src/lib/__tests__/leaderboardStore.test.js`
- Modify: `src/hooks/__tests__/useLeaderboardData.test.jsx`
- Modify: `src/lib/leaderboardStore.js`
- Modify: `src/hooks/useLeaderboardData.js`

**Step 1: Write the failing tests**

Add tests that:
- expect `getLeaderboardRange('weekly', now)` to support anchors from previous weeks
- expect `getLeaderboardRange('monthly', now)` to support anchors from previous months
- expect `useLeaderboardData` to cache separate responses for the same tab when the anchor date changes

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/leaderboardStore.test.js src/hooks/__tests__/useLeaderboardData.test.jsx`
Expected: FAIL because the hook currently caches only by period and the tests assert distinct historical windows.

**Step 3: Write minimal implementation**

Update the hook to:
- accept a leaderboard request object instead of only a tab name
- pass the anchor date through to `fetchLeaderboard`
- key the cache by both period and anchor date

Keep the store API compatible with the existing `period` plus `now` contract.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/leaderboardStore.test.js src/hooks/__tests__/useLeaderboardData.test.jsx`
Expected: PASS

### Task 2: Add failing popup coverage for history navigation

**Files:**
- Modify: `src/components/__tests__/LeaderboardPopup.test.jsx`
- Modify: `src/components/LeaderboardPopup.jsx`
- Modify: `src/App.css`

**Step 1: Write the failing tests**

Add tests that:
- expect previous and next buttons for `weekly` and `monthly`
- expect no history controls for `all_time`
- expect the forward button to be disabled when the popup is already on the current period
- expect clicking the buttons to call the navigation callback with `previous` or `next`

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx`
Expected: FAIL because the popup does not render navigation controls yet.

**Step 3: Write minimal implementation**

Add a small toolbar section that:
- renders a formatted period label
- wires previous and next buttons to a new navigation callback
- disables controls during loading and when the app reports the forward action is unavailable

Add only the CSS needed for the new toolbar layout and buttons.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx`
Expected: PASS

### Task 3: Wire app state to the new history navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/LeaderboardPopup.jsx`
- Modify: `src/hooks/useLeaderboardData.js`

**Step 1: Write the failing app-level test or extend existing targeted coverage**

Add or extend tests so period changes and navigation actions fetch the correct window for:
- current week or month on tab switch
- previous week or month on back navigation
- current period guard on forward navigation

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx src/hooks/__tests__/useLeaderboardData.test.jsx`
Expected: FAIL because `App.jsx` does not yet track per-period anchor dates or navigation direction.

**Step 3: Write minimal implementation**

Update `App.jsx` to:
- store anchor dates for `weekly` and `monthly`
- reset anchors to `new Date()` on tab switch
- move the active anchor backward or forward by one unit when the popup navigation is used
- pass the selected range metadata into the popup

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/LeaderboardPopup.test.jsx src/hooks/__tests__/useLeaderboardData.test.jsx src/lib/__tests__/leaderboardStore.test.js`
Expected: PASS

### Task 4: Run focused verification

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/LeaderboardPopup.jsx`
- Modify: `src/hooks/useLeaderboardData.js`
- Modify: `src/lib/leaderboardStore.js`
- Modify: `src/components/__tests__/LeaderboardPopup.test.jsx`
- Modify: `src/hooks/__tests__/useLeaderboardData.test.jsx`
- Modify: `src/lib/__tests__/leaderboardStore.test.js`

**Step 1: Run targeted verification**

Run: `npm test -- src/lib/__tests__/leaderboardStore.test.js src/hooks/__tests__/useLeaderboardData.test.jsx src/components/__tests__/LeaderboardPopup.test.jsx`
Expected: PASS

**Step 2: Run one broader smoke check**

Run: `npm test -- src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
Expected: PASS
