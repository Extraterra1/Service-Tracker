# Reservations Tab State Retention Design

## Problem

`App` conditionally renders `ReservationsWorkspace` only while the Reservations tab is active. Switching tabs unmounts the component, which discards its search, filters, pagination, results, and scroll state. Returning mounts a fresh component and fetches the latest ten reservations.

## Design

Keep the Reservations workspace mounted after its first visit. While another workspace is active, wrap it in a native `hidden` container so it is removed from layout and the accessibility tree without destroying its React state. The other workspaces retain their existing conditional lifecycle.

The workspace is not mounted before its first visit, avoiding an unnecessary initial reservation request. Once visited, returning to Reservations reveals the same component instance, so no request occurs unless its own query inputs or retry version change.

## Verification

Add a focused keep-alive lifecycle test that mounts a stateful child, switches away, and returns. Verify the child remains mounted, its state survives, and its mount-side fetch runs once. Run the focused test, existing Reservations tests, lint, and build.
