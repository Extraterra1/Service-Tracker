# Future Flights for All Approved Users Design

## Goal

Make `Voos futuros` available to every approved signed-in Service Tracker user while preserving the existing authentication and allowlist boundary.

## Design

Keep `Voos futuros` as the separate `futureFlights` workspace at `#voos-futuros`. Remove the admin-role condition from its header-menu action and from hash/workspace resolution. Do not merge it with the current-day `Voos` workspace or add it to the bottom navigation.

The existing future-flight behavior remains unchanged: opening the workspace starts at tomorrow, tomorrow remains the minimum selectable date, and the existing flight query and rendering paths continue to be used. Access management and other administrator-only controls remain gated by the admin role.

## Verification

Update the menu regression test to require `Voos futuros` for non-admin approved users and update workspace navigation tests so `#voos-futuros` resolves for both staff and administrators. Run the focused tests, relevant lint checks, production build, and `git diff --check`.
