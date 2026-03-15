# Agent Context

Start here if you are a new agent reading this repo for the first time.

## Recommended reading order

1. [`docs/agents/README.md`](docs/agents/README.md)
2. [`docs/agents/architecture-overview.md`](docs/agents/architecture-overview.md)
3. [`docs/agents/data-model-and-rules.md`](docs/agents/data-model-and-rules.md)
4. [`docs/agents/feature-map.md`](docs/agents/feature-map.md)
5. [`docs/agents/change-guide.md`](docs/agents/change-guide.md)
6. [`docs/agents/testing-and-invariants.md`](docs/agents/testing-and-invariants.md)
7. [`docs/agents/repo-map.md`](docs/agents/repo-map.md)

## What these docs cover

- how the app is structured
- how daily service data flows through the system
- which Firestore collections matter
- how auth, allowlist access, and Telegram approval fit together
- where to edit specific behaviors
- which invariants are already protected by tests

## Fast mental model

This app is a React/Vite PWA for a rental-car operations team.

The important model is:

1. `scraped-data/{date}` holds the cached base service list for a day
2. user mutations are stored separately in Firestore:
   - `service_status`
   - `service_time_overrides`
   - `service_ready`
3. every mutation is also mirrored into `service_activity/{date}/entries`
4. the UI merges base day data plus overlays client-side
5. writes are restricted to the current service day in `Atlantic/Madeira`

## If you only read three files

- [`src/App.jsx`](src/App.jsx)
- [`src/hooks/useServiceDayData.js`](src/hooks/useServiceDayData.js)
- [`firestore.rules`](firestore.rules)
