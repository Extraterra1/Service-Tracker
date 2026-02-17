# Service Tracker PWA

Mobile-first PWA for daily rental-car workflow.

## Features

- Side-by-side **Entregas** and **Recolhas** columns, including on mobile.
- Manual API refresh only (no polling / no automatic refresh timer).
- Team-shared realtime checklist state via Firestore listeners.
- Google Sign-In and allowlist gate (`staff_allowlist` collection).
- API PIN synced per Google account across devices (`user_settings` collection).
- Installable PWA (manifest + service worker).

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

- App fetches API data on:
  - first load (after auth + PIN),
  - date change,
  - explicit tap on **Atualizar lista**.
- App never does timer-based auto-refresh.
- Realtime is only for checklist status updates (Firestore snapshots).
