# Feature Map

This file maps visible product behavior to the code that drives it.

## Signed-out landing

Visible behavior:

- branded landing page
- Google sign-in button
- sign-in error display

Main files:

- `src/components/SignedOutLanding.jsx`
- `src/lib/auth.js`
- `src/hooks/useAccessGate.js`
- `src/App.jsx`

Notes:

- `authHint` is used so the app can distinguish a likely signed-out user from an in-progress auth restore
- the signed-out landing is shown before the main shell when auth is absent

## Access gate

Visible behavior:

- pending approval screen
- denied screen
- blocked screen
- retry access check

Main files:

- `src/components/AccessGateScreen.jsx`
- `src/hooks/useAccessGate.js`
- `src/lib/access.js`
- `functions/src/index.js`

Notes:

- pending users poll every 20 seconds
- access approval is not just a read of `staff_allowlist`; it can trigger request creation through the callable function
- approval is not considered complete until allowlist actually becomes active

## Header menu

Visible behavior:

- account/PIN section
- theme toggle
- completed shortcut
- time override shortcut
- activity popup trigger
- car history popup trigger
- leaderboard popup trigger
- session diagnostics copy action

Main files:

- `src/components/AppHeaderMenu.jsx`
- `src/components/AuthPanel.jsx`
- `src/hooks/usePinSync.js`
- `src/lib/sessionDiagnostics.js`

Notes:

- menu sections use custom open/close timing rather than default details behavior
- mutation controls are disabled for non-current dates

## Date navigation and refresh

Visible behavior:

- change selected date
- manual refresh button
- status line showing refresh state / last update
- stale warning

Main files:

- `src/components/DateNavigator.jsx`
- `src/hooks/useServiceDayData.js`
- `src/lib/scrapedDataStore.js`
- `src/lib/serviceRefreshLockStore.js`
- `src/lib/api.js`

Notes:

- manual refresh is always `forceRefresh=true`
- stale warning copy depends on whether renderable data already exists and whether a PIN is available

## Main service workspace

Visible behavior:

- two-pane list: `Entregas` and `Recolhas`
- loading skeletons
- locked empty state
- shared-plate marker popup

Main files:

- `src/features/service-workspace/ServiceWorkspace.jsx`
- `src/components/ServicePane.jsx`
- `src/components/ServiceItemCard.jsx`

Notes:

- the workspace does not set a recurring idle interval
- shared plate markers are derived by matching normalized plates across pickups and returns for the selected day

## Service item card

Visible behavior:

- done checkbox with haptics
- inline time edit menu
- ready toggle on plate button
- car model click opens history
- location sometimes opens Google Maps
- audit footer showing last updater

Main files:

- `src/components/ServiceItemCard.jsx`
- `src/lib/statusStore.js`
- `src/lib/timeOverrideStore.js`
- `src/lib/readyStore.js`
- `src/lib/phone.js`
- `src/lib/plates.js`

Behavior notes:

- ready toggle only exists for `pickup` items that have a plate
- car model button opens history by plate, independent of ready state
- location becomes a Google Maps link for normal addresses
- airport/escritorio-style locations remain plain text
- client names are visually clamped to first + middle initials + last

## Completed rollover

Visible behavior:

- done items remain visible in active lists for one hour
- then move into `Finalizados`
- menu action can force an item into completed immediately

Main files:

- `src/components/ServicePane.jsx`
- `src/lib/statusStore.js`
- `src/App.jsx`

Notes:

- this is based on timestamps, not a separate boolean like `archived`
- the UI schedules the next rollover timeout instead of polling constantly

## Activity popup

Visible behavior:

- day activity list with actor, action, item, plate, and time

Main files:

- `src/components/ActivityPopup.jsx`
- `src/hooks/useActivityEntries.js`
- `src/lib/activityStore.js`

Notes:

- reservation IDs are intentionally omitted from rendered activity metadata
- fallback plate can come from the current in-memory service list if not present in the activity record

## Car history popup

Visible behavior:

- searchable plate picker
- date-range controls
- fuzzy plate search
- list of services for a specific plate across a date window
- `Hoje` marker for current day

Main files:

- `src/components/CarHistoryPopup.jsx`
- `src/hooks/useCarHistory.js`
- `src/lib/carHistoryStore.js`

Notes:

- default range is 15 days before and after today
- history is built by reading scraped days and time overrides, not a precomputed history collection

## Leaderboard popup

Visible behavior:

- weekly/monthly/all-time tabs
- podium plus remainder list
- loading overlay when switching period with existing data

Main files:

- `src/components/LeaderboardPopup.jsx`
- `src/hooks/useLeaderboardData.js`
- `src/lib/leaderboardStore.js`
- `src/lib/staffProfileStore.js`

Notes:

- per-period results are cached for 5 minutes
- outdated in-flight responses are ignored so the UI does not revert to an older selection

## PIN sync

Visible behavior:

- API PIN stored per Google account
- cloud PIN can overwrite local PIN on sync
- local edits debounce before write

Main files:

- `src/hooks/usePinSync.js`
- `src/lib/pinStore.js`

Notes:

- if cloud PIN is empty but local PIN exists, local PIN seeds the cloud doc
- writes debounce at 400ms

## Session diagnostics

Visible behavior:

- "Copiar diagnostico de sessao" action
- transient status message after copy

Main files:

- `src/lib/sessionDiagnostics.js`
- `src/App.jsx`
- `src/components/AppHeaderMenu.jsx`

Notes:

- diagnostics intentionally avoid storing sensitive user details like email/displayName in the persisted report

## Styling and PWA shell

Main files:

- `src/index.css`
- `src/App.css`
- `vite.config.js`
- `public/*`

Notes:

- `index.css` defines theme variables and global shells
- `App.css` is the main component styling file and is large
- PWA manifest and runtime caching live in `vite.config.js`
