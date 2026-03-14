# Address Google Maps Links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open normal service addresses directly in Google Maps while leaving airport and `escritorio` entries as plain text.

**Architecture:** Keep the change local to `ServiceItemCard` by deriving a Google Maps search URL from the existing `item.location` value. Treat excluded locations as non-navigable so the rendered output stays text-only for those cases.

**Tech Stack:** React 19, Vite, Vitest, Testing Library

---

### Task 1: Add location-link regression coverage

**Files:**
- Create: `src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
- Modify: `src/components/ServiceItemCard.jsx`
- Modify: `src/App.css`

**Step 1: Write the failing test**

Add tests that:
- expect a normal address to render as a Google Maps link
- expect `AEROPORTO DA MADEIRA` to stay plain text
- expect `escritorio` to stay plain text

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
Expected: FAIL because `ServiceItemCard` currently renders the location as plain text only.

**Step 3: Write minimal implementation**

Add a small helper in `ServiceItemCard` to:
- normalize location text for exclusion matching
- skip Google Maps links for airport / `escritorio`
- render normal addresses as `https://www.google.com/maps/search/?api=1&query=...`

Add minimal link styling in `src/App.css`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
Expected: PASS

**Step 5: Run broader verification**

Run: `npm test -- src/components/__tests__/ServiceItemCard.carHistoryClick.test.jsx src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
Expected: PASS
