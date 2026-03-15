# Testing and Invariants

The tests in this repo are valuable because many important behaviors are indirect and would be easy to miss from UI reading alone.

## Test layout

Key locations:

- `src/lib/__tests__` - store logic, rules, date helpers, leaderboard, diagnostics
- `src/hooks/__tests__` - hook orchestration and async race behavior
- `src/components/__tests__` - UI-level regressions and CSS assumptions
- `src/features/service-workspace/__tests__` - workspace-level behavior

`src/test/setup.js` only wires `jest-dom` helpers.

## High-value invariants already covered

## Firestore current-day writes

Tests:

- `src/lib/__tests__/firestore.rules.test.js`
- `src/lib/__tests__/statusStore.test.js`
- `src/lib/__tests__/timeOverrideStore.test.js`
- `src/lib/__tests__/readyStore.test.js`

Protected behavior:

- status writes only for current service day
- time override writes only for current service day
- ready writes only for current service day
- activity writes only for current service day

Meaning:

- if you change date logic or rules, these are not optional details

## Auto-refresh lock semantics

Tests:

- `src/lib/__tests__/serviceRefreshLockStore.test.js`
- `src/hooks/__tests__/useServiceDayData.test.jsx`

Protected behavior:

- auto-refresh uses a 45-second lease
- auto-refresh skips API call if another client holds the lock
- manual refresh does not use the shared lock
- stale warning mentions 30-minute freshness threshold when refresh cannot run

## Completed rollover timing

Test:

- `src/components/__tests__/ServicePane.completedRollover.test.jsx`

Protected behavior:

- done items move to `Finalizados` only after threshold time passes
- the UI schedules a single timeout for the next rollover

## Leaderboard scoring

Test:

- `src/lib/__tests__/leaderboardStore.test.js`

Protected behavior:

- first completion per `date + itemId` scores once
- undo events do not score
- duplicate completions across users still only score once globally
- `ready_toggle` and `time_change` score
- tie-breaking uses `__entryId` when timestamps match
- weekly/monthly ranges are anchored to Madeira timezone
- all-time limit is 10,000

## PIN sync behavior

Test:

- `src/hooks/__tests__/usePinSync.test.jsx`

Protected behavior:

- cloud PIN loads on access
- cloud empty state can be seeded from local PIN
- local writes debounce
- redundant writes are avoided

## Car history behavior

Tests:

- `src/lib/__tests__/carHistoryStore.test.js`
- `src/lib/__tests__/carHistoryStore.fetch.test.js`
- `src/hooks/__tests__/useCarHistory.test.jsx`
- `src/components/__tests__/CarHistoryPopup.test.jsx`

Protected behavior:

- default date window is +/- 15 days
- overrides are applied to history
- plate options are deduped and normalized
- fuzzy search works
- "Hoje" marker appears for current-day rows

## Service item card regressions

Tests:

- `src/components/__tests__/ServiceItemCard.timeValidation.test.jsx`
- `src/components/__tests__/ServiceItemCard.carHistoryClick.test.jsx`
- `src/components/__tests__/ServiceItemCard.locationLink.test.jsx`
- `src/components/__tests__/ServiceItemCard.haptics.test.jsx`
- `src/components/__tests__/ServiceItemCard.timeMenuLayout.test.jsx`
- `src/components/__tests__/ServiceItemCard.menuFlashRegression.test.jsx`

Protected behavior:

- time editing uses native time input
- invalid/empty time disables save
- car-model click opens history without interfering with ready toggle
- normal addresses become Google Maps links
- airport/escritorio stay plain text
- haptics differ for done vs undone
- time-menu open state should not re-enable motion layout or CSS flash regressions

## Activity popup formatting

Test:

- `src/components/__tests__/ActivityPopup.test.jsx`

Protected behavior:

- activity rows show plate information
- reservation IDs are intentionally omitted from displayed metadata

## Leaderboard view behavior

Tests:

- `src/hooks/__tests__/useLeaderboardData.test.jsx`
- `src/components/__tests__/LeaderboardPopup.test.jsx`

Protected behavior:

- per-period caching
- switching periods does not allow stale async responses to clobber the active view
- loading overlay can appear while current rows remain visible

## Session diagnostics privacy

Test:

- `src/lib/__tests__/sessionDiagnostics.test.js`

Protected behavior:

- diagnostic report stores auth timing metadata
- diagnostic report should not serialize sensitive email or display-name data
- explicit sign-out is distinguished from unexpected logout

## What an agent should add tests for

If you change one of these areas, add or update tests before trusting the change:

- date/timezone behavior
- any Firestore write payload
- any new activity action type
- refresh-lock semantics
- leaderboard scoring rules
- card interaction behavior that depends on timing, motion, or CSS state

## What is notable by absence

There are many good regression tests, but some areas are still mostly enforced by architecture rather than deep integration tests:

- full sign-in to allowlist/Telegram flow end-to-end
- service worker runtime behavior
- broad end-to-end UI navigation across the whole app

Treat those areas more carefully because the test suite gives less complete coverage there.
