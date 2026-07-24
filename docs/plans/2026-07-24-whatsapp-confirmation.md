# WhatsApp Confirmation Messages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a non-persistent, admin-only menu pill that makes eligible service-card WhatsApp links include the correct day-before confirmation message.

**Architecture:** Keep the session-only toggle in `App`, pass it down the existing component tree, and centralize message eligibility and generation in a pure helper. The existing phone and service-location normalizers remain authoritative.

**Tech Stack:** React 19, JavaScript, Vitest, Testing Library, CSS.

---

### Task 1: Confirmation message helper

**Files:**
- Create: `src/lib/whatsappConfirmation.js`
- Create: `src/lib/__tests__/whatsappConfirmation.test.js`

**Step 1: Write the failing tests**

Cover the eight combinations of pickup/return, airport/office, and PT/EN. Assert the exact decoded message, paragraph breaks, supplied map URLs, airport-pickup time addition, and 24-hour effective time. Add cases for `overrideTime` precedence, unknown-country English fallback, unsupported locations, and missing time.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/__tests__/whatsappConfirmation.test.js`

Expected: FAIL because `whatsappConfirmation.js` does not exist.

**Step 3: Implement the minimal helper**

Export a function that accepts `{ item, phoneCountryCode, baseWhatsAppHref, enabled }`. Return the unchanged base href unless enabled, eligible, and timed. Otherwise choose the exact template and return `${baseWhatsAppHref}?text=${encodeURIComponent(message)}`.

**Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/lib/__tests__/whatsappConfirmation.test.js`

Expected: PASS.

### Task 2: Service-card link integration

**Files:**
- Modify: `src/components/ServiceItemCard.jsx`
- Modify: `src/components/ServicePane.jsx`
- Modify: `src/features/service-workspace/ServiceWorkspace.jsx`
- Modify: `src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

**Step 1: Write failing component tests**

Assert that confirmation mode adds the encoded eligible message, stays plain for unsupported locations, and propagates from `ServiceWorkspace` to both service panes/cards.

**Step 2: Run focused tests and verify RED**

Run: `npm test -- src/components/__tests__/ServiceItemCard.locationLink.test.jsx src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx`

Expected: FAIL because the confirmation prop and final href behavior do not exist.

**Step 3: Implement minimal prop flow and link composition**

Pass `whatsappConfirmationEnabled` through the workspace and pane. In the card, preserve phone normalization and use the helper only to compose the final href.

**Step 4: Run focused tests and verify GREEN**

Run the same focused command. Expected: PASS.

### Task 3: Admin-only menu pill

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify: `src/App.css`
- Create: `src/components/__tests__/AppHeaderMenu.whatsappConfirmation.test.jsx`

**Step 1: Write failing menu tests**

Assert that admins see a pill switch labelled `Confirmação WhatsApp`, staff do not, its initial state is off, and clicking it calls the toggle callback with the next value.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/__tests__/AppHeaderMenu.whatsappConfirmation.test.jsx`

Expected: FAIL because the control does not exist.

**Step 3: Implement the session-only state and pill**

Initialize `useState(false)` in `App`, pass value/callback only through the admin-aware menu, pass `canManageAccess && whatsappConfirmationEnabled` to the service workspace, and add accessible pill-switch styling for light/dark and focus states.

**Step 4: Run the focused test and verify GREEN**

Run the same focused command. Expected: PASS.

### Task 4: Regression verification

**Files:**
- Verify all modified files.

**Step 1: Run all directly related tests**

Run: `npm test -- src/lib/__tests__/whatsappConfirmation.test.js src/components/__tests__/ServiceItemCard.locationLink.test.jsx src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx src/components/__tests__/AppHeaderMenu.whatsappConfirmation.test.jsx`

Expected: PASS.

**Step 2: Run changed-file lint**

Run: `npx eslint src/lib/whatsappConfirmation.js src/lib/__tests__/whatsappConfirmation.test.js src/components/ServiceItemCard.jsx src/components/ServicePane.jsx src/features/service-workspace/ServiceWorkspace.jsx src/components/AppHeaderMenu.jsx src/App.jsx src/components/__tests__/ServiceItemCard.locationLink.test.jsx src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx src/components/__tests__/AppHeaderMenu.whatsappConfirmation.test.jsx`

Expected: no errors.

**Step 3: Run the production build**

Run: `npm run build`

Expected: successful Vite build and bundle-size check where configured.

**Step 4: Inspect the final diff**

Confirm the toggle remains admin-only and non-persistent, the eight templates match the approved copy, and unrelated files are untouched.
