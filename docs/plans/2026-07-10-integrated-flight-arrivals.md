# Integrated Flight Arrivals Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an authenticated, same-tab `Voos` workspace that automatically shows live FlightView arrivals for the selected day's normalized pickup flight numbers.

**Architecture:** Extend the app's hash workspace router with `#voos`, lazy-load a native React workspace, and invoke a new Firebase callable function. Migrate the Aviability Scraper's tested FlightView client and matching behavior into small Firebase Functions modules; keep per-flight failures, batch client requests at 20 flights, and do not persist live results.

**Tech Stack:** React 19, Vite, Firebase Auth/Functions v2, Node.js 20, Vitest, Testing Library, native `fetch`.

---

### Task 1: Add shared flight-number normalization

**Files:**
- Create: `src/features/flights/flightNumbers.js`
- Create: `src/features/flights/__tests__/flightNumbers.test.js`

**Step 1: Write the failing tests**

Cover pickup-only selection, outer trimming, internal whitespace removal, uppercase conversion, empty removal, stable order, and normalized deduplication:

```js
expect(getPickupFlightNumbers([
  { serviceType: 'pickup', flightNumber: ' TP 1685 ' },
  { serviceType: 'pickup', flightNumber: 'tp1685' },
  { serviceType: 'return', flightNumber: 'FR 123' },
  { serviceType: 'pickup', flightNumber: ' U2 7654 ' },
])).toEqual(['TP1685', 'U27654'])
```

Also assert `normalizeFlightNumber(null) === ''` and that tabs/newlines are removed with `\s+`.

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/features/flights/__tests__/flightNumbers.test.js`

Expected: FAIL because `flightNumbers.js` does not exist.

**Step 3: Implement the minimal helpers**

```js
export function normalizeFlightNumber(value) {
  return String(value ?? '').trim().replace(/\s+/g, '').toUpperCase()
}

export function getPickupFlightNumbers(items = []) {
  return [...new Set(items
    .filter((item) => item?.serviceType === 'pickup')
    .map((item) => normalizeFlightNumber(item?.flightNumber))
    .filter(Boolean))]
}
```

**Step 4: Run the test to verify it passes**

Run: `npm test -- src/features/flights/__tests__/flightNumbers.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/flights/flightNumbers.js src/features/flights/__tests__/flightNumbers.test.js
git commit -m "feat: normalize pickup flight numbers"
```

### Task 2: Migrate the FlightView lookup client

**Files:**
- Create: `functions/src/flights/flight-number-normalizer.js`
- Create: `functions/src/flights/flightview-client.js`
- Create: `functions/src/flights/airline-codes.json`
- Create: `functions/test/flight-number-normalizer.test.js`
- Create: `functions/test/flightview-client.test.js`
- Modify: `functions/package.json`

**Step 1: Add a Functions test command**

Add `"test": "node --test test/*.test.js"` to `functions/package.json`.

**Step 2: Write failing normalizer tests**

Port the behavioral cases from `/Users/cpires/Aviability-Scraper/test/flight-number-normalizer.test.ts`, including ICAO-to-IATA conversion and whitespace-tolerant input. The backend canonical form must remove whitespace before parsing.

**Step 3: Run the normalizer test to verify it fails**

Run: `npm --prefix functions test -- test/flight-number-normalizer.test.js`

Expected: FAIL because the module is missing.

**Step 4: Port the normalizer and code map**

Port `/Users/cpires/Aviability-Scraper/src/lib/flight-number-normalizer.ts` to JavaScript and copy `codes.json` to `functions/src/flights/airline-codes.json`. Resolve the JSON file relative to `import.meta.url`, not `process.cwd()`, so deployed Functions find it reliably. Normalize with:

```js
const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '')
```

**Step 5: Run the normalizer test to verify it passes**

Run: `npm --prefix functions test -- test/flight-number-normalizer.test.js`

Expected: PASS.

**Step 6: Write failing FlightView client tests**

Port the deterministic mocked-fetch cases from `/Users/cpires/Aviability-Scraper/test/flightview-client.test.ts`. Cover requested and previous departure dates, FNC/date matching, scheduled/estimated/actual extraction, source URL construction, non-OK responses, malformed payloads, no match, and ambiguous match.

**Step 7: Run the client tests to verify they fail**

Run: `npm --prefix functions test -- test/flightview-client.test.js`

Expected: FAIL because `flightview-client.js` is missing.

**Step 8: Port the minimal FlightView client**

Port `/Users/cpires/Aviability-Scraper/src/lib/flightview/client.ts` to JavaScript without Fastify or TypeScript-only types. Preserve dependency injection:

```js
export async function lookupFlightViewArrival(request, { fetchImpl = fetch } = {}) {
  // Query previous date and requested date, filter candidates, return success/error union.
}
```

Keep the scraper's API URL, origin/referer headers, local-date matching, and error codes unchanged.

**Step 9: Run all Functions tests**

Run: `npm --prefix functions test`

Expected: PASS.

**Step 10: Commit**

```bash
git add functions/package.json functions/src/flights functions/test
git commit -m "feat: add FlightView lookup client"
```

### Task 3: Add the authenticated arrivals callable

**Files:**
- Create: `functions/src/flights/arrivals-service.js`
- Create: `functions/src/flights/request.js`
- Create: `functions/test/arrivals-service.test.js`
- Create: `functions/test/flights-request.test.js`
- Modify: `functions/src/index.js`

**Step 1: Write failing service tests**

Port the result-order, deduped-upstream-lookup, summary, partial-error, and previous behavior cases from `/Users/cpires/Aviability-Scraper/test/flightview-service.test.ts`. Validate one to 20 uppercase, whitespace-free flight numbers and `YYYY-MM-DD` dates.

**Step 2: Run the service tests to verify they fail**

Run: `npm --prefix functions test -- test/arrivals-service.test.js test/flights-request.test.js`

Expected: FAIL because the modules are missing.

**Step 3: Implement request parsing and arrivals service**

Implement a plain-JavaScript parser returning `{ success, data }` or `{ success: false }`. Fix `airportCode` to `FNC` server-side; do not accept a client-selected airport. Build the response shape:

```js
{
  source: 'flightview',
  airportCode: 'FNC',
  arrivalDate,
  summary: { requested, resolved, failed },
  results: [{ flightNumber, status, scheduledArrivalLocal, estimatedArrivalLocal, actualArrivalLocal, sourceUrl }]
}
```

Errors remain `{ flightNumber, error: { code, message } }`. Do not port the scraper's process-wide busy flag.

**Step 4: Run the service tests to verify they pass**

Run: `npm --prefix functions test -- test/arrivals-service.test.js test/flights-request.test.js`

Expected: PASS.

**Step 5: Add callable authorization tests around an exported handler**

Factor the handler so it accepts `{ auth, data }` and injected `getAllowlistUser`/`service`. Assert it rejects missing authentication, inactive/missing `staff_allowlist/{uid}`, and invalid data; assert it calls the service for active staff.

**Step 6: Implement and export the callable**

In `functions/src/index.js`, export `getFlightArrivals = onCall({ cors: true }, handler)`. Use `HttpsError('unauthenticated', ...)`, `HttpsError('permission-denied', ...)`, and `HttpsError('invalid-argument', ...)`. Read `staff_allowlist/{uid}` and require `active === true` before lookup. Log upstream exceptions without logging auth tokens.

**Step 7: Run all Functions tests**

Run: `npm --prefix functions test`

Expected: PASS.

**Step 8: Commit**

```bash
git add functions/src/index.js functions/src/flights functions/test
git commit -m "feat: expose authenticated flight arrivals lookup"
```

### Task 4: Add the client callable and batching

**Files:**
- Create: `src/features/flights/flightsApi.js`
- Create: `src/features/flights/__tests__/flightsApi.test.js`

**Step 1: Write failing tests**

Mock `firebase/functions`. Assert:

- the Functions instance uses region `europe-west9`;
- no call is made for an empty list;
- 21 flights become sequential batches of 20 and 1;
- merged results preserve requested order;
- summaries are recomputed across batches; and
- an `AbortSignal`/request-generation guard prevents consumers from applying stale results.

**Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/flights/__tests__/flightsApi.test.js`

Expected: FAIL because the API module is missing.

**Step 3: Implement the callable client**

Use `getFunctions(app, 'europe-west9')` and `httpsCallable`. Export:

```js
export async function fetchFlightArrivals({ arrivalDate, flightNumbers }) {
  const batches = chunk(flightNumbers, 20)
  const responses = []
  for (const batch of batches) {
    responses.push((await lookup({ arrivalDate, flightNumbers: batch })).data)
  }
  const results = responses.flatMap((response) => response.results ?? [])
  return { source: 'flightview', airportCode: 'FNC', arrivalDate, summary: summarize(results), results }
}
```

Keep batching sequential to avoid hammering FlightView.

**Step 4: Run tests to verify they pass**

Run: `npm test -- src/features/flights/__tests__/flightsApi.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/flights/flightsApi.js src/features/flights/__tests__/flightsApi.test.js
git commit -m "feat: add flight arrivals client"
```

### Task 5: Extend same-tab workspace navigation

**Files:**
- Modify: `src/lib/workspaceNavigation.js`
- Modify: `src/lib/__tests__/workspaceNavigation.test.js`
- Modify: `src/components/AppHeaderMenu.jsx`
- Modify: `src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/features/service-workspace/__tests__/ServiceWorkspace.test.jsx` or add `src/__tests__/App.flightsNavigation.test.jsx`

**Step 1: Write failing routing tests**

Assert `resolveWorkspace('#voos', false) === 'flights'`, while `#reservas` remains admin-only. Assert the menu renders a `Voos` button, calls `onWorkspaceChange('flights')`, and no longer renders the external `Aviability Lookup` anchor.

**Step 2: Run targeted tests to verify they fail**

Run: `npm test -- src/lib/__tests__/workspaceNavigation.test.js src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

Expected: FAIL because `#voos` and the native action are absent.

**Step 3: Extend routing and app state**

Map hashes explicitly:

```js
export function resolveWorkspace(hash, canManageAccess) {
  if (hash === '#voos') return 'flights'
  if (hash === '#reservas' && canManageAccess) return 'reservations'
  return 'services'
}
```

In `App.jsx`, parse the initial hash, handle `hashchange`, and update `handleWorkspaceChange` for `services`, `flights`, and admin-only `reservations`. Use `window.history.pushState` in the same tab. Do not clear `selectedDate`.

**Step 4: Replace the external link**

Remove `getAviabilityLookupUrl`. Add a Plane icon action labelled `Voos` that calls `onWorkspaceChange('flights')`; when already in flights, provide `Lista de Serviço` as the return action. Keep reservations navigation available to admins without making flights admin-only.

**Step 5: Run routing/menu tests**

Run: `npm test -- src/lib/__tests__/workspaceNavigation.test.js src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/workspaceNavigation.js src/lib/__tests__/workspaceNavigation.test.js src/components/AppHeaderMenu.jsx src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx src/App.jsx
git commit -m "feat: add native flights workspace navigation"
```

### Task 6: Build the native Flights workspace

**Files:**
- Create: `src/features/flights/FlightsWorkspace.jsx`
- Create: `src/features/flights/__tests__/FlightsWorkspace.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`

**Step 1: Write failing component tests**

Mock `fetchFlightArrivals` and cover:

- no call and Portuguese empty state when there are no pickup flights;
- automatic call with normalized pickup flights and selected date;
- loading state;
- success rows with status and scheduled/estimated/actual times;
- safe placeholders for missing times;
- FlightView source link with `target="_blank"` and `rel="noreferrer"`;
- inline per-flight failure while successful rows remain visible;
- whole-request error plus retry button;
- a changed date/list ignores the older promise result; and
- return button calls `onWorkspaceChange('services')`.

**Step 2: Run the component test to verify it fails**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx`

Expected: FAIL because `FlightsWorkspace.jsx` is missing.

**Step 3: Implement request lifecycle and semantic markup**

Use `useMemo` for normalized flights and a monotonically increasing request ID in `useRef`. On each date/list change, increment the ID, reset relevant state, and apply a response only when its ID is current. Use a retry counter or callback to repeat the current request.

Render Portuguese labels: `Voos`, `Chegadas ao Funchal`, `Programado`, `Estimado`, `Real`, `Estado`, `Tentar novamente`, and clear localized error messages for the four backend error codes.

**Step 4: Wire the lazy workspace into App**

Add:

```jsx
const FlightsWorkspace = lazy(() => import('./features/flights/FlightsWorkspace'))
```

Render it when `activeWorkspace === 'flights'`, passing `selectedDate`, `allServiceItems`, and `onWorkspaceChange`. Keep `DateNavigator` visible for services and flights so staff can change the day without leaving the page; hide its service refresh control in flights or add an explicit prop if necessary.

**Step 5: Add responsive styling**

Add dedicated `.flights-*` styles using existing tokens. Use a compact board/list rather than copying the scraper's standalone visual design. Ensure 320px layouts have no horizontal overflow, status is not conveyed by color alone, focus rings are visible, and dark theme variables work.

**Step 6: Run component and navigation tests**

Run: `npm test -- src/features/flights/__tests__/FlightsWorkspace.test.jsx src/lib/__tests__/workspaceNavigation.test.js src/components/__tests__/AppHeaderMenu.accordionAnimation.test.jsx`

Expected: PASS.

**Step 7: Commit**

```bash
git add src/features/flights/FlightsWorkspace.jsx src/features/flights/__tests__/FlightsWorkspace.test.jsx src/App.jsx src/App.css
git commit -m "feat: add integrated flight arrivals workspace"
```

### Task 7: Update repository guidance and verify the feature

**Files:**
- Modify: `docs/agents/architecture-overview.md`
- Modify: `docs/agents/feature-map.md`
- Modify: `docs/agents/testing-and-invariants.md`
- Modify: `README.md` if deployment instructions list Functions exports

**Step 1: Document the feature**

Describe `#voos`, pickup-only normalized inputs, the authenticated `getFlightArrivals` callable, the 20-flight sequential batching rule, live/no-persistence behavior, and the main frontend/backend files.

**Step 2: Run formatting and static verification**

Run: `git diff --check`

Expected: no output.

Run: `npm run lint`

Expected: exit 0.

**Step 3: Run backend and frontend tests**

Run: `npm --prefix functions test`

Expected: all Functions tests pass.

Run: `npm test`

Expected: all frontend tests pass.

**Step 4: Run production build and bundle check**

Run: `npm run build:perf`

Expected: Vite build succeeds and bundle thresholds pass. Confirm the flights workspace is a separate lazy chunk.

**Step 5: Perform manual browser verification**

Start the Functions emulator and Vite app with valid Firebase configuration. Verify:

1. `Voos` opens `#voos` in the same tab.
2. Browser back returns to the prior workspace.
3. A value such as ` TP 1685 ` is requested/displayed once as `TP1685`.
4. Return-service flights do not appear.
5. Changing the date refreshes the board.
6. Empty, partial failure, whole failure, retry, light theme, dark theme, desktop, and narrow mobile layouts are usable.
7. A signed-out or non-allowlisted direct callable request is rejected.

**Step 6: Commit documentation**

```bash
git add docs/agents README.md
git commit -m "docs: describe integrated flight arrivals"
```

### Task 8: Final review

**Files:**
- Review all files changed since commit `16ca659`.

**Step 1: Inspect the complete diff**

Run: `git diff 16ca659..HEAD --stat && git diff 16ca659..HEAD`

Expected: only the planned flight feature, tests, and documentation are present.

**Step 2: Re-run final verification**

Run: `npm --prefix functions test && npm test && npm run lint && npm run build:perf && git diff --check`

Expected: every command exits 0.

**Step 3: Review security and privacy**

Confirm the callable checks both Firebase authentication and active allowlist membership, the client cannot choose arbitrary airports, no session tokens or personal service data are logged, and upstream failures do not leak unexpected payloads.

**Step 4: Commit any review fixes separately**

If review finds an issue, add the smallest regression test first, make the fix, rerun the affected suite, and commit with a focused message. If no fixes are needed, do not create an empty commit.
