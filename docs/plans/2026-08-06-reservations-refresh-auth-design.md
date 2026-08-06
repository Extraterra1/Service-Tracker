# Reservations Refresh Authentication Design

## Problem

Loading the app directly on `#reservas` mounts the reservations workspace before Firebase has restored the signed-in user. The workspace immediately requests data, while the API client rejects because `auth.currentUser` is still empty. Nothing retries the request when authentication later becomes ready.

## Design

Keep the existing keep-alive workspace behavior, but pass an explicit readiness flag from `App` to `ReservationsWorkspace`. The workspace must wait until the user is authenticated and access is allowed before requesting reservations. When readiness changes to true, the existing effect runs automatically. API and network failures after that point continue to use the current error and retry UI.

## Verification

Add a component regression test that renders the workspace as not ready, confirms no request is made, then changes it to ready and confirms reservations load. Run the focused reservations tests, lint, and production build.
