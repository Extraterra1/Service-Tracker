# TV Operations Board Design

## Purpose

Add a hidden, read-only `#tv` workspace for a 16:9 television that makes the next unfinished delivery and next unfinished recolha readable from across the room.

## Selection rules

- Select the earliest unfinished delivery and recolha independently.
- An overdue but unfinished service remains next until staff complete it elsewhere.
- Use the existing manual time override when sorting by reservation time.
- For the featured delivery, display the matched flight's effective arrival time when live flight data exists; otherwise display the delivery reservation time.
- For the recolha, always display the reservation/override time and ignore flight data.

## Layout

Use a fixed asymmetric board: the delivery occupies roughly the upper 70% and the recolha the lower 30%. The delivery time is the visual anchor. Both sections show only glanceable operational details: client, location, vehicle/plate, reservation reference, plus flight number and status for a flight-backed delivery.

The visual direction is a calm, high-contrast operations/departure board using the existing Sora typeface, restrained red accents, and fluid oversized type sized for a TV. Empty states keep the section labels and clearly state that no unfinished item remains.

## Application behavior

`#tv` resolves to a dedicated workspace but is not added to the header menu or bottom tabs. In TV mode the normal app header, banners, menus, editing controls, and tab bar are omitted. The board consumes the same realtime service, completion, override, and shared flight-cache data as the rest of the app and advances automatically when completion state changes.

Authentication and access rules remain unchanged. Loading, unavailable-data, and empty states are rendered inside the board rather than falling back to the normal service workspace.

## Verification

Add unit tests for workspace hash resolution and next-item/time selection, component tests for hierarchy and empty/loading states, and an app-level assertion that `#tv` renders without standard navigation. Run the focused test files, full test suite, lint, and production build.
