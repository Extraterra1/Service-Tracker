# Location Icons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a small airport icon next to airport locations and a small house icon next to `ESCRITORIO` locations without changing the existing Google Maps link behavior for normal addresses.

**Architecture:** Keep the change local to `ServiceItemCard` by deriving a tiny location-type hint from the already normalized location text. Render the icon inline inside the existing location row so airport and `escritorio` entries remain plain text while regular addresses stay clickable Google Maps links.

**Tech Stack:** React 19, Lucide React, Vite, Vitest, Testing Library

---

### Task 1: Extend location-row regression coverage

**Files:**
- Modify: `src/components/__tests__/ServiceItemCard.locationLink.test.jsx`

**Step 1: Write the failing test**

Add tests that:
- expect airport entries to render a plane icon next to the plain-text location label
- expect `escritorio` entries to render a house icon next to the plain-text location label
- keep the existing assertions that those special locations are not rendered as links

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
Expected: FAIL because the current component does not render a house icon for `escritorio` entries and does not expose a dedicated inline icon contract for the location row tests.

### Task 2: Implement the minimal location icon rendering

**Files:**
- Modify: `src/components/ServiceItemCard.jsx`
- Modify: `src/App.css`

**Step 1: Write minimal implementation**

Add a small helper in `ServiceItemCard` to:
- classify airport-style locations
- classify `escritorio`-style locations
- return the correct inline icon component only for those plain-text location rows

Keep:
- airport and `escritorio` rows non-clickable
- regular addresses as Google Maps links
- the existing `aeroporto` label normalization

**Step 2: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
Expected: PASS

### Task 3: Run focused regression verification

**Files:**
- Test: `src/components/__tests__/ServiceItemCard.carHistoryClick.test.jsx`
- Test: `src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`

**Step 1: Run targeted regressions**

Run: `npm test -- src/components/__tests__/ServiceItemCard.carHistoryClick.test.jsx src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
Expected: PASS
