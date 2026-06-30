# Reservations Workspace Delight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a concise ten-row reservations list with stored-country flags, complete booking details in an accessible popup, pagination, and responsive loading skeletons.

**Architecture:** Keep fetching, filtering, and pagination in `ReservationsWorkspace`, extract display normalization and detail-field grouping into small pure helpers where useful, and render one responsive list vocabulary instead of a wide table. A local selected-reservation state controls a purpose-built dialog that receives the complete API record.

**Tech Stack:** React 19, Vitest, Testing Library, lucide-react, react-country-flag, CSS.

---

### Task 1: Specify compact loading and pagination behavior

**Files:**
- Modify: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`
- Modify: `src/features/reservations/ReservationsWorkspace.jsx`

**Step 1: Write failing tests**

Add tests asserting the initial API call uses `pageSize: 10`, the page-size choices start at 10, and ten accessible skeleton rows appear while the request is unresolved.

**Step 2: Verify RED**

Run: `npm test -- src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

Expected: FAIL because the current default is 50 and the loading surface has no structural skeletons.

**Step 3: Implement minimal behavior**

Change the default page size to 10, offer `[10, 25, 50, 100]`, and add a ten-row skeleton branch inside the reservation list.

**Step 4: Verify GREEN**

Run the focused test command and expect all focused tests to pass.

### Task 2: Specify concise reservation items

**Files:**
- Modify: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`
- Modify: `src/features/reservations/ReservationsWorkspace.jsx`

**Step 1: Write failing tests**

Assert that the list item exposes only client, stored country, status, pickup/dropoff date-time, vehicle group, and plate. Assert that phone, email, reference, money, stations, origin, comments, and flight are absent before opening details.

**Step 2: Verify RED**

Run the focused suite and expect the restricted-content assertions to fail against the current wide table.

**Step 3: Implement minimal behavior**

Replace the table with semantic list buttons using stable column labels and `ReactCountryFlag`. Add country normalization that prioritizes the stored `countryCode` or `country` value and never derives a flag from the phone number.

**Step 4: Verify GREEN**

Run the focused suite and expect the concise-item tests to pass.

### Task 3: Specify complete booking details

**Files:**
- Create: `src/features/reservations/ReservationDetailsPopup.jsx`
- Modify: `src/features/reservations/ReservationsWorkspace.jsx`
- Modify: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1: Write failing tests**

Assert click and keyboard activation open a dialog named for the reservation. Verify all known booking values appear, unknown non-empty fields are retained, Escape and the close button dismiss the dialog, and focus returns to the selected item.

**Step 2: Verify RED**

Run the focused suite and expect failures because no dialog exists.

**Step 3: Implement minimal behavior**

Create the popup with labeled field groups, a supplementary group for unknown API keys, document-level Escape handling, focus restoration, backdrop dismissal, and a close control.

**Step 4: Verify GREEN**

Run the focused suite and expect dialog tests to pass.

### Task 4: Apply the responsive visual system

**Files:**
- Modify: `src/App.css`
- Modify: `src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

**Step 1: Write failing contract tests**

Add targeted assertions for skeleton animation with reduced-motion override, visible focus treatment, desktop grid alignment, mobile restructuring, and dialog/backdrop classes.

**Step 2: Verify RED**

Run the focused suite and expect the CSS contract assertions to fail.

**Step 3: Implement minimal styling**

Use existing panel, text, stroke, accent, and status tokens. Add compact row hover/active/focus states, responsive grid rules, skeleton shimmer, quiet dialog elevation, and 150–200ms state transitions. Avoid decorative gradients, side stripes, and nested cards.

**Step 4: Verify GREEN**

Run the focused suite and expect all contract tests to pass.

### Task 5: Verify the finished feature

**Files:**
- Modify only if verification exposes a defect.

**Step 1: Run focused tests**

Run: `npm test -- src/features/reservations/__tests__/ReservationsWorkspace.test.jsx`

Expected: PASS.

**Step 2: Run full tests and lint**

Run: `npm test`

Run: `npm run lint`

Expected: PASS with no new warnings.

**Step 3: Build production output**

Run: `npm run build`

Expected: PASS.

**Step 4: Review the diff**

Run: `git diff --check` and inspect `git diff` to confirm the change is scoped to reservations UI, tests, styles, and plans.
