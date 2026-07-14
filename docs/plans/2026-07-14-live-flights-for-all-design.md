# Live Flights for All — Design

## Goal

Make the existing **Voos** tab show the real-time current-day flights workspace to every authenticated user who can enter the application.

## Scope

- Remove the admin/development-account gate around the current-day live flights workspace.
- Keep **Voos futuros** and all other admin-only functionality unchanged.
- Preserve the existing authentication and general application access gate.
- Remove access-only code and tests that become obsolete.

## Architecture

`App` will render `CurrentFlightsWorkspace` through the existing lightweight workspace wrapper without passing a viewer permission. The wrapper will no longer branch to the old coming-soon view. This keeps the current flights data flow, cache, refresh behavior, and client grouping unchanged while eliminating an obsolete authorization branch.

## Testing

Update the workspace access test first so its default render expects live flights for an ordinary user. Run it red against the current gate, remove the gate, then run the focused flights tests and production build.
