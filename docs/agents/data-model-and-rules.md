# Data Model and Rules

## Service-day model

The app revolves around a single selected date string in `YYYY-MM-DD` format.

That date is interpreted in the `Atlantic/Madeira` timezone, not the browser's local timezone.

This matters for:

- current-day write eligibility
- leaderboard period boundaries
- stale-cache logic
- any agent trying to reason about "today"

## Primary data collections

### `staff_allowlist/{uid}`

Purpose:

- authorizes an authenticated user to act as active staff

Read/write model:

- client can read only their own document
- client cannot write
- Cloud Functions/admin workflows manage it

Important fields seen in repo:

- `active`
- `displayName`
- `email`
- `role`
- approval metadata when Telegram approves access

### `staff_profiles/{uid}`

Purpose:

- lightweight profile mirror for leaderboard display and other identity uses

Written by:

- client via `upsertOwnStaffProfile`

Rules:

- active staff can read
- signed-in user can create/update only their own doc

Fields:

- `uid`
- `displayName`
- `firstName`
- `email`
- `photoURL`
- `updatedAt`

### `user_settings/{uid}`

Purpose:

- stores per-user API PIN

Written by:

- client via `pinStore`

Rules:

- user can read/write only their own doc

Fields:

- `apiPin`
- `updatedAt`

### `scraped-data/{date}`

Purpose:

- canonical cached day payload from the external service API

Read/write model:

- active staff can read
- clients cannot write

Used by:

- `useServiceDayData`
- car history reconstruction

Important fields:

- `date`
- `cachedAt`
- `pickups`
- `returns`

### `service_status/{date}_{itemId}`

Purpose:

- team completion state per service item

Written by:

- `setItemDoneState`

Rules:

- active staff read allowed
- create/update only for the current Madeira service day
- `docId` must match `date + "_" + itemId`
- immutable identity fields on update
- delete denied

Fields:

- `date`
- `itemId`
- `serviceType`
- `done`
- `updatedAt`
- `updatedByUid`
- `updatedByName`
- `updatedByEmail`

### `service_time_overrides/{date}_{itemId}`

Purpose:

- per-item manual time edits

Written by:

- `setItemTimeOverride`

Rules:

- same current-day and doc-id constraints as `service_status`
- `overrideTime` must be valid `HH:mm`
- delete denied

Fields:

- `date`
- `itemId`
- `serviceType`
- `originalTime`
- `overrideTime`
- `updatedAt`
- `updatedByUid`
- `updatedByName`
- `updatedByEmail`

### `service_ready/{date}_{itemId}`

Purpose:

- vehicle readiness state for delivery/pickup items

Written by:

- `setItemReadyState`

Rules:

- same current-day and doc-id constraints
- only `serviceType == "pickup"`
- plate required
- delete denied

Fields:

- `date`
- `itemId`
- `serviceType`
- `plate`
- `ready`
- `updatedAt`
- `updatedByUid`
- `updatedByName`
- `updatedByEmail`

### `service_activity/{date}/entries/{entryId}`

Purpose:

- append-only activity log used for human review and leaderboard scoring

Written by:

- each mutation store writes a matching activity entry in the same batch

Rules:

- active staff can read
- create only
- current-day only
- action-specific shape validation
- update/delete denied

Action types:

- `status_toggle`
- `time_change`
- `ready_toggle`

Shared fields:

- `actionType`
- `date`
- `itemId`
- `serviceType`
- `done`
- `createdAt`
- `updatedByUid`
- `updatedByName`
- `updatedByEmail`
- `itemName`
- `itemTime`
- `reservationId`
- optional `oldTime`
- optional `newTime`
- optional `ready`
- optional `plate`

Special notes:

- `time_change` requires `oldTime` and `newTime`
- `ready_toggle` requires `ready` and `plate`
- collection-group read access is explicitly allowed for `/entries/{entryId}` so leaderboard queries work

### `service_refresh_locks/{date}`

Purpose:

- client-coordinated lease document for stale auto-refresh deduplication

Written by:

- `tryAcquireAutoRefreshLease`

Rules:

- active staff can read
- active staff can create/update valid payload
- delete denied

Fields:

- `date`
- `ownerUid`
- `cacheVersion`
- `leaseUntil`
- `updatedAt`

### `access_requests/{uid}`

Purpose:

- server-managed access request state

Read/write model:

- user can read only their own request doc
- client cannot write directly
- Cloud Functions manage lifecycle

Observed states:

- `pending`
- `approved`
- `denied`
- `blocked`

### `access_blocks_uid/{uid}` and `access_blocks_email/{emailNormalized}`

Purpose:

- blocklists for denied access escalation

Read/write model:

- no client read/write
- server-only

## External API contract

The app calls:

- `GET /getjson?date=YYYY-MM-DD`
- `GET /getjson?date=YYYY-MM-DD&forceRefresh=true`

Header:

- `X-PIN`

Used payload shape:

- `data.date`
- `data.pickups`
- `data.returns`

Normalization happens in `src/lib/api.js`.

Important normalization details:

- `itemId` is synthesized if missing
- `location` is normalized so `Aeroporto da Madeira` becomes `AEROPORTO`

## Client-side merged view model

The visible list is not one stored document.

Rendered item state is built from:

1. base item from `scraped-data`
2. time override from `service_time_overrides`
3. done state from `service_status`
4. ready state from `service_ready`

This means:

- changing the displayed time does not modify the base scraped document
- done/ready/time state can be reasoned about independently
- car history can reconstruct historical state by combining scraped days plus overrides

## Current-day rule details

The client and Firestore rules both enforce "current service day only" mutations.

Key details:

- the service day is calculated in `Atlantic/Madeira`
- Firestore rules implement DST-aware date calculation
- `isCurrentServiceDate` exists in client code
- tests explicitly cover past-day and future-day write rejection

Do not treat local browser date as authoritative.

## Refresh-lock semantics

Auto-refresh only:

- if day cache is stale or missing
- and if the current client can acquire a 45-second lease

Manual refresh:

- always forces refresh
- does not use the shared lock

Failure mode:

- lock transaction failures fail open, meaning refresh can continue rather than leave the UI stale forever

## Leaderboard data model

The leaderboard is built from collection-group reads over `entries`.

Important semantics:

- it is derived, not stored
- all-time queries are capped at 10,000 entries
- tied scores share rank numbers
- profile info is merged from `staff_profiles`
- fallback identity comes from activity entry fields when no profile exists

## Documents that are effectively append-only

Treat these as append-only in behavior:

- `service_activity/{date}/entries/*`

Do not build features that assume activity entries are edited later.

## Documents that are authoritative for UI state

Treat these as authoritative per concern:

- `scraped-data/{date}` - source day payload
- `service_status/*` - done state
- `service_time_overrides/*` - manual time
- `service_ready/*` - vehicle readiness
- `service_refresh_locks/*` - auto-refresh coordination
