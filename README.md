# Service Tracker PWA

Mobile-first PWA for daily rental-car workflow.

## Features

- Side-by-side **Entregas** and **Recolhas** columns, including on mobile.
- Manual API refresh only (no polling / no automatic refresh timer).
- Team-shared realtime checklist state via Firestore listeners.
- Google Sign-In and allowlist gate (`staff_allowlist` collection).
- Telegram-based access approval queue (`access_requests` + Cloud Functions webhook).
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
- `VITE_FIREBASE_FUNCTIONS_REGION` (optional, default `europe-west9`)

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

## Access approval backend (Telegram)

This repo now includes Firebase Cloud Functions under `functions/`:

- `requestAccessApproval` (callable): user-side request trigger.
- `telegramWebhook` (HTTPS): handles Telegram inline Approve / Deny / Block.

### Configure secrets

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_ADMIN_CHAT_ID
firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET
```

### Deploy functions + rules

```bash
firebase deploy --only functions,firestore:rules
```

### Set Telegram webhook

Replace `<REGION>`, `<PROJECT_ID>`, `<WEBHOOK_SECRET>`, `<BOT_TOKEN>`:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://<REGION>-<PROJECT_ID>.cloudfunctions.net/telegramWebhook",
    "secret_token":"<WEBHOOK_SECRET>"
  }'
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

### `access_requests/{uid}` (server-managed)

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

Client reads own document only. Writes are denied for clients.

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
