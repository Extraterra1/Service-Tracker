# Agent Onboarding Guide

This folder is a first-pass context pack for a new agent reading the `Service-Tracker` repo for the first time.

Read in this order:

1. `README.md` - quick orientation and core mental model
2. `architecture-overview.md` - runtime structure and data flow
3. `data-model-and-rules.md` - Firestore collections, write paths, security constraints
4. `feature-map.md` - how the visible product maps to code
5. `change-guide.md` - where to edit specific behaviors and what not to break
6. `testing-and-invariants.md` - what the current tests are protecting
7. `repo-map.md` - concise map of major folders and files

## What this app is

`Service Tracker` is a mobile-first React/Vite PWA for a rental-car operations team.

The app shows a day-based list of:

- `Entregas` (`pickup` in code)
- `Recolhas` (`return` in code)

The codebase combines four concerns:

1. Team sign-in and access approval
2. Reading a per-day service list from Firestore cache
3. Mutating team-owned per-item state in Firestore
4. Deriving secondary views such as activity history, car history, and leaderboard

## Core mental model

The main system model is:

1. A selected service day drives almost everything.
2. The base service list comes from `scraped-data/{date}` in Firestore.
3. If that cached day is missing or older than 30 minutes, the client may force-refresh it through the external `/getjson` API.
4. Team mutations do not rewrite the scraped day. They are stored separately in Firestore:
   - `service_status`
   - `service_time_overrides`
   - `service_ready`
5. Every mutation is also mirrored into `service_activity/{date}/entries`.
6. The UI recomposes the final view client-side by merging scraped data with the mutation collections.

This separation is the most important thing to understand before changing behavior.

## Fast orientation

If you only have a few minutes, inspect these files first:

- `src/App.jsx` - top-level orchestration
- `src/hooks/useAccessGate.js` - auth and access flow
- `src/hooks/useServiceDayData.js` - service-day loading and refresh rules
- `src/hooks/useDateCollections.js` - realtime subscriptions for per-day mutation collections
- `src/components/ServiceItemCard.jsx` - most per-item UI behavior
- `src/lib/statusStore.js`
- `src/lib/timeOverrideStore.js`
- `src/lib/readyStore.js`
- `firestore.rules`
- `functions/src/index.js`

## Important repo truths

- The product language is mostly Portuguese, but code identifiers are mixed English/Portuguese.
- `pickup` means a delivery-style outbound service shown under `Entregas`.
- `return` means an inbound service shown under `Recolhas`.
- Mutations are intentionally restricted to the current Madeira service day.
- Access is not just Google sign-in; it is Google sign-in plus allowlist approval, with a Telegram approval workflow.
- The repo does not contain the source scraper. It consumes an existing API and stores the resulting day payload in Firestore.
- There is no global state library. The app is mostly hook state plus Firestore subscriptions.

## High-risk areas for changes

- Date logic tied to `Atlantic/Madeira`
- Current-day-only write rules in both client code and Firestore rules
- Any mutation path that must also append a `service_activity` entry
- Auto-refresh locking through `service_refresh_locks`
- Leaderboard scoring rules based on activity entries
- The "completed after 1 hour" rollover behavior

## Non-core content

The repo includes files that are not central to runtime behavior:

- `tmp/` contains temporary PDF/image artifacts
- `public/` is mainly static icon and PWA asset content
- `docs/plans/` contains historical implementation planning notes

These are useful for context, but they are not where product logic lives.

## What to read next

- For architecture: `architecture-overview.md`
- For data and permissions: `data-model-and-rules.md`
- For change work: `change-guide.md`
