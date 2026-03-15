# Change Guide for Future Agents

This is the most action-oriented file in the set.

## If you need to change auth or access approval

Start here:

- `src/hooks/useAccessGate.js`
- `src/lib/access.js`
- `src/lib/auth.js`
- `functions/src/index.js`
- `firestore.rules`

Watch for:

- signed-out vs checking vs pending vs allowed vs denied vs blocked
- callable request creation side effects
- Telegram cooldown behavior
- allowlist read restrictions

Do not assume:

- a signed-in user can read service data
- `approved` request status alone means access is already granted

## If you need to change service-day loading or refresh behavior

Start here:

- `src/hooks/useServiceDayData.js`
- `src/lib/scrapedDataStore.js`
- `src/lib/serviceRefreshLockStore.js`
- `src/lib/api.js`

Watch for:

- stale vs missing day handling
- auto-refresh vs manual refresh
- lock acquisition only for auto-refresh
- PIN-dependent error/warning copy

Do not:

- add periodic polling to the workspace without a strong reason
- bypass the refresh lock for automatic refreshes

## If you need to change done-state behavior

Start here:

- `src/App.jsx`
- `src/lib/statusStore.js`
- `src/components/ServicePane.jsx`
- `src/lib/dateCollectionsMaps.js`
- `firestore.rules`

Critical invariants:

- writes only for current Madeira service day
- source write and activity write happen together
- completed rollover is timestamp-based
- menu shortcut for `Finalizados` relies on backdating timestamp by 65 minutes

Common mistake:

- changing only the checkbox UI and forgetting the rollover logic or activity log

## If you need to change time override behavior

Start here:

- `src/components/ServiceItemCard.jsx`
- `src/components/AppHeaderMenu.jsx`
- `src/lib/timeOverrideStore.js`
- `src/lib/dateCollectionsMaps.js`
- `src/lib/carHistoryStore.js`
- `firestore.rules`

Critical invariants:

- valid `HH:mm`
- current-day-only writes
- activity log must include `oldTime` and `newTime`
- displayed time in the list is an overlay, not a rewrite of scraped data
- car history depends on overrides when reconstructing historical entries

## If you need to change ready-state behavior

Start here:

- `src/components/ServiceItemCard.jsx`
- `src/lib/readyStore.js`
- `src/lib/dateCollectionsMaps.js`
- `firestore.rules`

Critical invariants:

- only `pickup` items can be marked ready
- plate is required
- ready state can affect the audit footer if its timestamp is newer than status
- ready toggles also score on the leaderboard via activity entries

## If you need to change activity or leaderboard behavior

Start here:

- `src/lib/activityStore.js`
- `src/components/ActivityPopup.jsx`
- `src/lib/leaderboardStore.js`
- `src/hooks/useLeaderboardData.js`
- `src/components/LeaderboardPopup.jsx`

Critical invariants:

- activity entries are append-only
- leaderboard is derived client-side
- only first completion per `date + itemId` counts
- all-time mode caps at 10,000 entries
- old async leaderboard responses must not overwrite the currently selected period

Common mistake:

- treating every `done=true` event as scoreable

## If you need to change car history behavior

Start here:

- `src/hooks/useCarHistory.js`
- `src/lib/carHistoryStore.js`
- `src/components/CarHistoryPopup.jsx`

Critical invariants:

- default range is +/- 15 days around today
- history is built from `scraped-data` plus `service_time_overrides`
- plate search is fuzzy, not strict substring
- no precomputed history collection exists in this repo

## If you need to change diagnostics or session debugging

Start here:

- `src/lib/sessionDiagnostics.js`
- `src/App.jsx`
- `src/components/AppHeaderMenu.jsx`

Critical invariants:

- persisted report should not contain sensitive user PII fields
- auth sign-out reason tries to distinguish explicit from unexpected logout

## If you need to change Firestore rules

Read first:

- `firestore.rules`
- `src/lib/__tests__/firestore.rules.test.js`
- `src/lib/date.js`

Critical invariants:

- current day is timezone-aware and DST-aware
- activity/time/ready/status writes have strict payload validation
- `entries` collection-group read access is intentionally open to active staff because leaderboard needs it

Do not:

- loosen rules for convenience in the client without understanding the cross-feature impact

## If you need to change styling

Start here:

- `src/index.css`
- `src/App.css`
- component-specific tests that assert CSS invariants

Critical invariants protected by tests:

- location links styling
- item location line should not inherit shared line-through decoration
- no `:has()` z-index toggle for time-menu flash workaround
- no containment hacks tied to `.has-time-menu`

## Safe-change checklist

Before editing a feature, answer these questions:

1. What is the authoritative collection or derived source for this behavior?
2. Does this change require a mirrored activity entry?
3. Is the behavior current-day-only?
4. Is the selected date interpreted in Madeira timezone?
5. Is there already a test that encodes the invariant I am about to touch?

If the answer to any of those is unclear, stop and trace the feature through `App.jsx`, the relevant hook, the relevant store, and `firestore.rules` before patching.
