# Repo Map

This is a concise map of the repo. It is not a raw file dump; it highlights where the important logic lives.

## Root

- `package.json` - frontend scripts, dependencies, Vitest entry points
- `vite.config.js` - Vite config, bundle chunking, PWA setup, runtime caching
- `firebase.json` - Firebase Functions + Firestore config
- `firestore.rules` - main backend permission and payload guardrail file
- `firestore.indexes.json` - index config, especially for `entries` collection-group reads
- `vercel.json` - manifest response headers
- `README.md` - user-facing project setup summary

## `src/`

### Entry and shell

- `src/main.jsx` - browser boot
- `src/App.jsx` - orchestration layer
- `src/index.css` - global theme variables and base shell
- `src/App.css` - large shared component stylesheet

### `src/components/`

UI components, mostly presentational but some include real interaction logic.

Most important:

- `ServiceItemCard.jsx` - richest item interaction surface
- `ServicePane.jsx` - active vs completed split
- `AppHeaderMenu.jsx` - menu sections and quick actions
- `ActivityPopup.jsx`
- `CarHistoryPopup.jsx`
- `LeaderboardPopup.jsx`
- `AccessGateScreen.jsx`
- `SignedOutLanding.jsx`

### `src/features/service-workspace/`

- `ServiceWorkspace.jsx` - two-pane daily workspace, shared plate popup logic

### `src/hooks/`

Feature orchestration hooks.

Most important:

- `useAccessGate.js`
- `useServiceDayData.js`
- `useDateCollections.js`
- `usePinSync.js`
- `useActivityEntries.js`
- `useCarHistory.js`
- `useLeaderboardData.js`

### `src/lib/`

Core data and integration layer.

Important groups:

- Firebase setup:
  - `firebaseApp.js`
  - `firebaseAuth.js`
  - `firebaseDb.js`
  - `firebaseFunctions.js`
- access/auth:
  - `auth.js`
  - `access.js`
- day loading:
  - `api.js`
  - `scrapedDataStore.js`
  - `serviceRefreshLockStore.js`
- mutation stores:
  - `statusStore.js`
  - `timeOverrideStore.js`
  - `readyStore.js`
- derived data:
  - `activityStore.js`
  - `carHistoryStore.js`
  - `leaderboardStore.js`
- utilities:
  - `date.js`
  - `timestamp.js`
  - `plates.js`
  - `phone.js`
  - `dateCollectionsMaps.js`
  - `sessionDiagnostics.js`
  - `staffProfileStore.js`
  - `pinStore.js`

### `src/test/`

- `setup.js` - Testing Library matcher setup

### `src/**/__tests__/`

Behavioral regression coverage across lib/hooks/components/features.

## `functions/`

Firebase Functions project.

- `functions/src/index.js` - access approval callable + Telegram webhook
- `functions/package.json` - functions runtime scripts
- `functions/scripts/cleanup-out-of-day-writes.mjs` - admin/maintenance script for detecting and optionally deleting writes whose local write date does not match stored service date

This cleanup script is operational tooling, not part of the normal app request path.

## `public/`

Static assets for PWA and icons.

Not core product logic.

## `docs/plans/`

Historical planning documents.

Useful if you want to understand why a specific feature changed recently, but not necessary for first-pass runtime understanding.

## `tmp/`

Temporary files and PDF/image artifacts.

Treat as non-core unless a task explicitly involves those files.

## Practical reading shortcuts

If task is about:

- auth/access -> `App.jsx`, `useAccessGate.js`, `access.js`, `functions/src/index.js`
- daily list freshness -> `useServiceDayData.js`, `scrapedDataStore.js`, `serviceRefreshLockStore.js`, `api.js`
- item mutation -> `ServiceItemCard.jsx`, relevant store module, `firestore.rules`
- activity/leaderboard -> `activityStore.js`, `leaderboardStore.js`, matching tests
- car history -> `CarHistoryPopup.jsx`, `useCarHistory.js`, `carHistoryStore.js`
- styling regression -> component test plus `App.css`/`index.css`
