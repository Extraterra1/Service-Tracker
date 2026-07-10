# Admin Flights and Loading Skeleton Design

## Goal

Temporarily restrict the flights workspace to administrators, make the company logo a reliable route back to the service list, and replace flight loading text/spinners with an arrivals-board skeleton.

## Access and navigation

`resolveWorkspace` will treat both `#reservas` and `#voos` as admin-only. Non-admin users who load either hash resolve to services, and `App.jsx` removes an unauthorized hash with `replaceState`.

The menu renders `Voos` only for administrators. The JustDrive logo becomes a semantic button that invokes the existing workspace navigation handler with `services`, closes the menu if necessary, removes the hash, and preserves the selected date.

## Skeleton

Create a reusable `FlightsWorkspaceSkeleton` component that mirrors the flight board rather than showing generic loading copy. It includes a board header placeholder and several flight-row placeholders for the flight number, three time values, and status.

Use the same skeleton for the lazy-import Suspense fallback and for service-data/arrival-data loading inside `FlightsWorkspace`. It uses existing colors and spacing, is hidden from assistive technology while its container announces loading, has no horizontal overflow at 320px, and disables shimmer animation under reduced motion.

## Lockfile

Restore `package-lock.json` to the committed version. Its current diff contains only npm-generated `peer` metadata changes and no dependency version change.

## Testing

Tests cover admin/non-admin hash resolution, non-admin redirect cleanup, hidden menu action, admin action, logo-to-services navigation, skeleton use in both loading boundaries, responsive CSS hooks, and reduced-motion behavior.
