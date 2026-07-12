# Future Flights Design

## Goal

Turn the admin flight workspace into a future-flight view that starts tomorrow and cannot navigate back to today.

## Design

Rename the admin menu action to `Voos futuros`. Entering that workspace always selects tomorrow in the Madeira service timezone. Direct `#voos` access also clamps the initially selected date to tomorrow.

The existing date navigator remains familiar but accepts a minimum date and preset configuration. In the future-flight workspace its preset button reads `Próximos`, selects tomorrow, the date input uses tomorrow as its minimum, and the previous-day button disables at that boundary. Future dates remain freely selectable. Other workspaces retain the current `Hoje` behavior.

## Verification

Tests cover the renamed admin action, tomorrow calculation, the future-only date input, the `Próximos` preset, and the disabled previous-day boundary. Existing navigation and flight tests, the full suite, lint, and the production build run before a local-only merge.
