# Service Tracker PWA

Mobile-first PWA for daily rental-car workflow.

## Features

- Side-by-side **Entregas** and **Recolhas** columns, including on mobile.
- Auto-refresh when Firestore cache is missing or older than 30 minutes.
- Shared auto-refresh lock to avoid duplicate API calls from multiple online users.
- Manual force refresh button (**Atualizar lista**) remains available.
- Team-shared realtime checklist state via Firestore listeners.
- Google Sign-In and allowlist gate (`staff_allowlist` collection).
- Firestore-only access approval queue in the app menu (`access_requests` + `staff_allowlist`).
- API PIN synced per Google account across devices (`user_settings` collection).
- Installable PWA (manifest + service worker).
- Admin-only reservation lookup backed by the live cPanel database.

## Stack

- React + Vite
- Firebase Auth (Google)
- Firestore realtime listeners
- Existing Sheet Generator API (`/getjson`)

## Environment

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variables:

- `VITE_API_BASE_URL`: base URL for the Sheet API.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (optional)

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Local authentication bypass

Local development can automatically sign in a dedicated Firebase debug account while continuing to use live Firestore data and the existing security rules.

1. In Firebase Authentication, enable the **Email/Password** provider.
2. Create a dedicated debug user. Do not reuse a personal or production staff password.
3. Copy that user's UID and create `staff_allowlist/{uid}` in Firestore with `active: true` and the least-privileged appropriate role.
4. Create an ignored `.env.local` file containing:

```dotenv
VITE_LOCAL_AUTH_BYPASS=true
VITE_LOCAL_AUTH_EMAIL=debug-account@example.com
VITE_LOCAL_AUTH_PASSWORD=replace-with-the-debug-account-password
```

5. Restart `npm run dev` after changing the environment file.

The bypass activates only when Vite is running in development mode and the explicit flag and both credentials are present. Production builds always leave it disabled. An existing authenticated Firebase session is preserved, and failed automatic sign-in falls back to the normal Google sign-in screen. Never commit `.env.local` or relax Firestore rules for this account.

## Access approval backend (Firestore-only)

Access approval is handled directly through Firestore and guarded by `firestore.rules`:

- signed-in users create/update their own pending `access_requests/{uid}` document
- active admins (`staff_allowlist/{uid}.role == "admin"`) can read pending access requests in the app menu
- active admins can list active/inactive staff allowlist users
- active admins can approve by writing `staff_allowlist/{uid}` and marking the request `approved`
- active admins can deny by marking the request `denied`
- active admins can revoke an existing user by setting their allowlist record inactive and marking their request `blocked`

### Deploy rules

```bash
firebase deploy --only firestore:rules
```

## Firestore collections expected

### `staff_allowlist/{uid}`

```json
{
  "active": true,
  "displayName": "Staff Name",
  "email": "staff@example.com",
  "role": "staff"
}
```

Use `"role": "admin"` for users who can manage access requests and revoke users.

### `service_status/{date}_{itemId}`

```json
{
  "date": "2026-02-13",
  "itemId": "...",
  "serviceType": "pickup",
  "done": true,
  "updatedAt": "serverTimestamp",
  "updatedByUid": "...",
  "updatedByName": "...",
  "updatedByEmail": "..."
}
```

### `user_settings/{uid}`

```json
{
  "apiPin": "1234",
  "updatedAt": "serverTimestamp"
}
```

Required Firestore rule behavior for this collection:

- users can read/write only their own `user_settings/{uid}` document
- `uid` must match `request.auth.uid`

### `access_requests/{uid}`

```json
{
  "uid": "firebaseUid",
  "email": "user@example.com",
  "emailNormalized": "user@example.com",
  "displayName": "User Name",
  "status": "pending",
  "requestCount": 1
}
```

Signed-in users can create/update only their own pending request. Active admins can list pending requests, mark them approved or denied, and block revoked users from the app menu.

## Reservation bridge

Reservation requests go directly from the browser to `api.justdrivemadeira.com` with the signed-in user's Firebase ID token. The cPanel API verifies the token, checks `staff_allowlist/{uid}`, and reads the private MySQL database. Reservation data is never stored in Firestore or browser caches.

- The reservation list requires an active `admin` profile.
- Reservation details opened from service cards require any active staff profile.
- cPanel CORS allows only the configured Service Tracker production origin and local development origin.
- No Firebase Cloud Function or shared browser-visible API secret is used.

### `service_refresh_locks/{date}` (client-coordinated auto-refresh lease)

```json
{
  "date": "2026-03-05",
  "ownerUid": "firebaseUid",
  "cacheVersion": "1741168800000",
  "leaseUntil": "timestamp",
  "updatedAt": "timestamp"
}
```

Used to coordinate stale-cache auto-refresh across concurrent clients so only one auto-refresh call is made per lease window.

## API contract used by this app

`GET /getjson?date=YYYY-MM-DD[&forceRefresh=true]`

Headers:

- `X-PIN: 1234`

Response shape used:

```json
{
  "data": {
    "pickups": [{ "itemId": "...", "serviceType": "pickup" }],
    "returns": [{ "itemId": "...", "serviceType": "return" }]
  }
}
```

## Manual refresh behavior

- App subscribes to Firestore `scraped-data/{date}`.
- If cache is missing or older than 30 minutes, app attempts auto-refresh.
- Auto-refresh is deduped across clients with `service_refresh_locks/{date}`.
- Manual tap on **Atualizar lista** still performs forced API refresh (`forceRefresh=true`).
- App does not use periodic timer polling.
- Realtime is only for checklist status updates (Firestore snapshots).
