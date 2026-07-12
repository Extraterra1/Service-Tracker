# Bottom Tab Navigation Design

## Goal

Integrate the local `Tab-Bar` repository's liquid-glass bottom navigation into Service Tracker with three universally visible destinations: Mapa, Voos, and Reservas.

## Navigation model

Service Tracker will retain its existing hash-based workspace navigation instead of adding a router dependency. The destinations are:

- Mapa: the service-list workspace at the base URL with no hash.
- Voos: `#voos`, showing a dedicated `Proximamente` placeholder workspace.
- Reservas: `#reservas`, showing the existing reservations workspace.

The URL remains the source of truth, so refreshes, bookmarks, hash changes, and browser back/forward navigation keep the tab selection and visible workspace synchronized. `#porta-chaves` remains supported through the header menu and leaves all three bottom tabs inactive because it is outside the bottom navigation.

## Access model

All three bottom navigation items and their destinations are available to every approved user. The current client-side admin restriction on Voos and Reservas will be removed. Authentication and the existing approved-user access gate remain unchanged. The reservation data path will be verified to ensure its backend behavior is consistent with this intentional UI permission change.

## Components and styling

The reusable JSX TabBar component from `/Users/cpires/Tab-Bar` will be copied into Service Tracker rather than depending on the sibling repository at runtime. Its public API stays data-driven: tabs, active tab ID, and an `onChange` callback.

Its CSS will be adapted to Service Tracker's design tokens rather than copying the demo theme verbatim. It will use the app's red accent, light and dark surfaces, compact typography, safe-area positioning, keyboard focus styles, and reduced-motion behavior. The authenticated app shell will reserve enough bottom space that fixed navigation never obscures operational content.

The bar will render only inside the approved authenticated application shell. Signed-out, pending, denied, and blocked access screens remain unchanged.

## Voos placeholder

The current flight-arrivals implementation will remain in the repository but will no longer be mounted from the primary navigation. A small lazy-loaded workspace will present the heading `Voos`, the message `Proximamente`, and restrained supporting copy consistent with the application's operational visual language.

## Testing

Tests will cover:

- resolving `#voos` and `#reservas` for non-admin approved users;
- mapping workspace IDs to bottom-tab IDs;
- tab rendering, active state, and click behavior;
- the Voos placeholder copy;
- app-level navigation visibility and destination behavior where practical;
- production build and focused regression tests.

