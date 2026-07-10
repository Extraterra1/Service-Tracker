# Direct Flight API Design

## Goal

Keep the native Service Tracker flights workspace while replacing its Firebase callable with direct browser requests to the public Aviability API.

## Architecture

The Aviability Fastify app will allow cross-origin browser requests with public CORS headers and `OPTIONS` preflight support. Service Tracker will send each normalized batch directly to `https://fncfutures.vercel.app/arrivals`, configurable through `VITE_FLIGHTS_API_URL`.

Firebase remains responsible for Service Tracker sign-in, access gating, and service-day data. It no longer participates in flight-status lookup.

## Aviability changes

- Add `@fastify/cors`.
- Register CORS before application routes.
- Allow all origins, `POST` and `OPTIONS`, and the `content-type` header.
- Add tests for preflight and cross-origin `/arrivals` responses.
- Deploy Aviability and verify browser-visible CORS headers before switching Service Tracker.

## Service Tracker changes

- Replace `firebase/functions` usage in `flightsApi.js` with `fetch`.
- Keep sequential batches of at most 20 flights and preserve result ordering and summary recomputation.
- Treat non-2xx, malformed JSON, and malformed response shapes as safe request failures handled by the existing workspace retry UI.
- Add `VITE_FLIGHTS_API_URL` to `.env.example`, defaulting in code to the deployed Aviability endpoint.
- Remove the flight callable export, backend implementation modules, airline data, backend flight tests, and their documentation references.
- Leave unrelated Firebase Functions and Telegram integrations unchanged.

## Deployment and cleanup

Deploy and verify Aviability first. After Service Tracker uses the direct API successfully, delete the deployed `getFlightArrivals` Firebase Function. Do not alter unrelated deployed functions or secrets.

## Testing

The scraper tests cover CORS and retain all arrival lookup behavior. Service Tracker tests cover the direct request URL, JSON body, sequential batching, response merging, and transport/error handling. Existing workspace lifecycle, partial-result, retry, normalization, responsive, and navigation tests remain green.
