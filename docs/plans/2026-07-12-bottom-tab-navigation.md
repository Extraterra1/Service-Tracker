# Bottom Tab Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a three-item liquid-glass bottom tab bar that gives every approved user access to Mapa, a Voos placeholder, and Reservas.

**Architecture:** Keep the existing URL-hash workspace model as the source of truth and add pure mapping helpers between workspaces and tabs. Copy the reusable JSX tab component into the app, theme it with existing CSS variables, and replace the mounted flight dashboard with a dedicated lazy-loaded placeholder while retaining the old flight code for future use.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, lucide-react, CSS.

---

### Task 1: Make workspace navigation universally available

**Files:**
- Modify: `src/lib/__tests__/workspaceNavigation.test.js`
- Modify: `src/lib/workspaceNavigation.js`
- Modify: `src/App.jsx`

1. Update the navigation tests so `resolveWorkspace('#voos', false)` returns `flights` and `resolveWorkspace('#reservas', false)` returns `reservations`.
2. Add failing tests for a pure `getPrimaryTabId(workspace)` helper mapping services to `map`, flights to `flights`, reservations to `reservations`, and keyrings to an empty ID.
3. Run `npm test -- src/lib/__tests__/workspaceNavigation.test.js` and verify the changed expectations fail.
4. Remove the admin parameter from workspace resolution, implement `getPrimaryTabId`, and simplify `App.jsx` so approved non-admin users are not redirected away from flights or reservations.
5. Update `handleWorkspaceChange` so all approved app users can select services, flights, reservations, or keyrings while retaining existing hashes.
6. Run the focused test and confirm it passes.

### Task 2: Port and harden the reusable tab component

**Files:**
- Create: `src/components/TabBar/TabBar.jsx`
- Create: `src/components/TabBar/TabBar.css`
- Create: `src/components/__tests__/TabBar.test.jsx`

1. Write tests that render three supplied tabs, verify the active button uses `aria-current="page"`, and verify clicking Reservas calls `onChange('reservations')`.
2. Run `npm test -- src/components/__tests__/TabBar.test.jsx` and verify it fails because the component is absent.
3. Copy the data-driven JSX structure from `/Users/cpires/Tab-Bar`, using button refs for the moving indicator and a localized `aria-label="Navegação principal"`.
4. Adapt the CSS to scoped component variables, app theme variables, visible `:focus-visible`, safe-area placement, responsive width, dark mode, and `prefers-reduced-motion`.
5. Run the focused component test and confirm it passes.

### Task 3: Add the Voos placeholder workspace

**Files:**
- Create: `src/features/flights/FlightsComingSoonWorkspace.jsx`
- Create: `src/features/flights/__tests__/FlightsComingSoonWorkspace.test.jsx`
- Modify: `src/App.css`

1. Write a test asserting the workspace exposes a `Voos` heading and `Proximamente` message.
2. Run `npm test -- src/features/flights/__tests__/FlightsComingSoonWorkspace.test.jsx` and verify it fails because the component is absent.
3. Implement a semantic, compact placeholder with a plane icon and supporting Portuguese copy.
4. Add light/dark responsive styles consistent with existing workspace panels.
5. Run the focused test and confirm it passes.

### Task 4: Integrate bottom navigation into the authenticated shell

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.css`
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify or create: `src/components/__tests__/AppNavigation.test.jsx`

1. Add or update tests proving all approved users see Mapa, Voos, and Reservas and that selecting each destination updates the visible workspace/hash.
2. Run the focused test and verify it fails before integration.
3. Define stable tab metadata with Map, Plane, and Calendar-style Lucide icons outside `App`.
4. Render `TabBar` inside the authenticated shell, derive its active ID from `activeWorkspace`, and delegate selection to `handleWorkspaceChange`.
5. Replace the mounted `FlightsWorkspace` with lazy-loaded `FlightsComingSoonWorkspace` and remove flight-only date-toolbar behavior from the visible placeholder.
6. Remove duplicate Voos/Reservas actions from the header menu if they would create redundant primary navigation; retain Porta-chaves there.
7. Add bottom safe spacing to the authenticated shell/content without affecting signed-out and access-gate layouts.
8. Run the focused app navigation test and confirm it passes.

### Task 5: Verify permissions, regressions, and production output

**Files:**
- Modify if needed: `docs/agents/feature-map.md`

1. Inspect reservation API and Firestore rule paths to confirm approved non-admin users can load the intended reservation data without an admin-only backend check.
2. Update the feature map to describe universal bottom navigation and the Voos placeholder.
3. Run `npm test -- src/lib/__tests__/workspaceNavigation.test.js src/components/__tests__/TabBar.test.jsx src/features/flights/__tests__/FlightsComingSoonWorkspace.test.jsx`.
4. Run the relevant existing reservation and app workspace tests.
5. Run `npm run lint` and resolve introduced warnings or errors.
6. Run `npm run build` and confirm the production build succeeds.
7. Inspect `git diff --check` and the final diff for accidental or unrelated changes.
