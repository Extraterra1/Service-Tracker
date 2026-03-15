# Architecture Overview

## Top-level shape

This is a client-heavy React app with a small Firebase backend surface.

Frontend stack:

- React 19
- Vite
- Vite PWA plugin
- Firebase Auth
- Firestore realtime listeners
- Firebase Functions callable/HTTP endpoints

Backend surface in this repo:

- Firestore rules and indexes
- Cloud Functions for access approval and Telegram webhook handling

External dependency outside this repo:

- Existing `/getjson` HTTP API used to refresh a day's service list

## Boot and runtime entry points

### Browser boot

- `index.html` sets language, theme color, fonts, icons
- `src/main.jsx` registers the PWA service worker and renders `App`

### App shell

`src/App.jsx` is the orchestration layer. It owns:

- selected date
- PIN and PIN sync state
- theme
- mutation-in-flight state
- popup open/close state
- cross-feature derived state
- handlers that bridge UI actions to store modules

It is the best single file for understanding how the product is wired together.

## Major frontend layers

### Layer 1: access and session

`useAccessGate` handles:

- Firebase auth subscription
- token-change tracking
- initial access resolution
- retry/poll behavior for pending approval
- signed-out vs pending vs allowed vs denied vs blocked vs firebase-missing

It delegates the actual access checks to `src/lib/access.js`.

### Layer 2: service-day source data

`useServiceDayData` handles:

- subscribing to `scraped-data/{date}`
- deciding whether cached data is stale
- forcing refresh through the external API
- coordinating refresh attempts through `service_refresh_locks/{date}`
- manual refresh vs auto-refresh behavior

This hook is the only place where day data freshness is decided.

### Layer 3: per-day mutation overlays

`useDateCollections` subscribes to:

- `service_status`
- `service_time_overrides`
- `service_ready`

Those streams are normalized into in-memory maps keyed by `itemId`.

The main list never mutates the base scraped payload directly. The UI overlays these collections on top of the day snapshot.

### Layer 4: feature popups and secondary views

Separate hooks and stores power:

- activity popup
- car history popup
- leaderboard popup

These features reuse the same underlying Firestore data rather than introducing separate backend APIs.

## Runtime data flow

The normal happy path is:

1. User lands signed out.
2. User signs in with Google.
3. `useAccessGate` decides whether the user is allowed immediately or must go through request approval.
4. Once access is allowed, `useServiceDayData` subscribes to `scraped-data/{selectedDate}`.
5. If cached data is fresh, it renders immediately.
6. If cached data is stale or missing, the app may call `/getjson` to force refresh.
7. `useDateCollections` subscribes to mutation collections for the same date.
8. `App.jsx` merges base data plus overrides into the displayed lists.
9. User actions write to the mutation collections and append activity entries.
10. Secondary UI such as activity, car history, and leaderboard read from those collections.

## Mutation architecture

There are three main user mutations:

1. Mark item done / undone
2. Set manual time override
3. Toggle vehicle ready state

Each mutation follows the same pattern:

1. UI event in `App.jsx`
2. lazy-load corresponding store module
3. store writes the source collection document
4. store writes a mirrored `service_activity/{date}/entries/{entryId}` record
5. realtime listeners update the UI

The store modules are:

- `src/lib/statusStore.js`
- `src/lib/timeOverrideStore.js`
- `src/lib/readyStore.js`

If you add a new mutation type, this mirrored-write pattern is the first architectural precedent to follow.

## Important derived behaviors

### Completed rollover

`ServicePane` does not move a completed item to `Finalizados` immediately.

Instead:

- a done item remains in the active list for one hour after `updatedAt`
- once that threshold passes, it moves into the completed accordion

There is one special case:

- the "Adicionar" action in the header menu writes a backdated timestamp through `forceCompletedNow`
- that uses a 65-minute offset so the item moves to `Finalizados` immediately

This behavior is subtle and easy to break if you only look at the checkbox UI.

### Shared refresh locking

When stale data is auto-refreshed, the app tries to acquire a 45-second lease in `service_refresh_locks/{date}`.

This prevents multiple open clients from hammering the external API at the same time.

Manual refresh does not use the shared lock.

### Leaderboard scoring

The leaderboard is computed client-side from `service_activity` entries.

Scoring rules:

- first `status_toggle` to `done=true` for a given `date + itemId` scores 1 point
- later re-completions for the same date/item do not score again
- `time_change` scores 1
- `ready_toggle` scores 1

The leaderboard is not a separate persisted aggregate.

## Cloud Functions architecture

`functions/src/index.js` has two exported functions:

### `requestAccessApproval`

Callable function used by the client when signed-in but not allowlisted.

Responsibilities:

- check if user is already active in `staff_allowlist`
- check blocklists by UID/email
- create or update `access_requests/{uid}`
- enforce Telegram notification cooldown
- send Telegram message with inline Approve / Deny / Block buttons

### `telegramWebhook`

HTTP function receiving Telegram callback actions.

Responsibilities:

- validate webhook secret
- ensure callback came from the configured admin chat
- update `access_requests/{uid}`
- on approval, create/update `staff_allowlist/{uid}`
- on block, write to blocklist collections
- edit the original Telegram message to reflect the final state

## Performance and loading decisions

The repo has several deliberate performance choices:

- `ServiceWorkspace` is lazy-loaded
- store modules are lazy-loaded only when needed
- Vite manual chunking splits Firebase Auth, Firestore, and icon bundles
- leaderboard data is cached per period for 5 minutes
- there is no recurring polling interval in the workspace itself
- service worker runtime caching is limited and mainly aimed at the external API

## Where architecture decisions are enforced

- `firestore.rules` - backend guardrails
- `src/lib/__tests__/firestore.rules.test.js` - current-day write behavior
- `src/hooks/__tests__/useServiceDayData.test.jsx` - refresh and lock behavior
- `src/lib/__tests__/leaderboardStore.test.js` - scoring semantics
- `src/components/__tests__/ServicePane.completedRollover.test.jsx` - delayed completed rollover

The tests are important because many behaviors are intentionally indirect.
