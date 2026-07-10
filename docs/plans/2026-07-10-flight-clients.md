# Flight Clients Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display every pickup client beneath its matching flight with operational contact and reservation links.

**Architecture:** Build a memoized lookup from normalized flight numbers to pickup service items inside `FlightsWorkspace`. Pass the matching clients into each flight result and render them with existing phone utilities and the country-flag component; keep URL validation local to the flight workspace.

**Tech Stack:** React 19, React Country Flag, existing phone helpers, CSS, Vitest, Testing Library

---

### Task 1: Specify flight-to-client matching

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsWorkspace.jsx`

**Step 1: Write failing tests**

Add tests proving that spaced and lowercase flight numbers match API flight results, and that multiple matching pickups render beneath the same result in source order.

**Step 2: Run the focused test**

Run: `npx vitest run src/features/flights/__tests__/FlightsWorkspace.test.jsx`

Expected: FAIL because flight results do not render service clients.

**Step 3: Implement the lookup and client rows**

Reuse `normalizeFlightNumber` to group pickup items. Pass each result's group into `FlightResult` and render all clients beneath the flight summary.

**Step 4: Run the focused test**

Expected: PASS.

### Task 2: Add client actions and resilient presentation

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/features/flights/FlightsWorkspace.jsx`
- Modify: `src/App.css`

**Step 1: Write failing interaction tests**

Assert the phone-derived country flag, WhatsApp URL, `Reservations` label and new-tab URL. Assert missing or unsafe URLs do not become links.

**Step 2: Run the tests to verify RED**

Expected: FAIL because the actions do not exist.

**Step 3: Implement links and responsive styles**

Use `detectPhoneCountryCode` and `getWhatsAppHref`, validate reservation URLs as HTTP(S), and add compact desktop/mobile client layouts.

**Step 4: Run the tests to verify GREEN**

Expected: PASS.

### Task 3: Align the loading skeleton

**Files:**
- Modify: `src/features/flights/__tests__/FlightsWorkspaceSkeleton.test.jsx`
- Modify: `src/features/flights/FlightsWorkspaceSkeleton.jsx`
- Modify: `src/App.css`

**Step 1: Write a failing skeleton test**

Assert each flight skeleton includes a client placeholder strip.

**Step 2: Implement the minimal placeholder**

Add one quiet client-shaped placeholder to each illustrative row without additional animation.

**Step 3: Run focused tests**

Expected: PASS.

### Task 4: Verify, commit, and merge locally

**Files:**
- Modify only if verification reveals a scoped issue.

**Step 1: Run verification**

Run: `npm test`, changed-file ESLint, `git diff --check`, and `npm run build:perf`.

**Step 2: Commit**

Commit the tested implementation on `codex/flight-clients`.

**Step 3: Merge locally**

Fast-forward `master` to the feature branch. Do not push or deploy.
