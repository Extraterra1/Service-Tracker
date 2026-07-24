# WhatsApp Confirmation Messages Design

## Goal

Let administrators temporarily change eligible service-card WhatsApp links so they open a prefilled day-before confirmation message chosen from the service type, location, client phone country, and effective service time.

## User experience

- Add an admin-only pill switch labelled `Confirmação WhatsApp` to the app menu.
- The switch always initializes off and is not persisted.
- While off, all WhatsApp links keep their current plain-conversation behavior.
- While on, airport and office Entregas/Recolhas open WhatsApp with a prefilled confirmation message.
- Services at any other location keep their current plain-conversation behavior.
- Portuguese phone numbers (`+351`, as detected by the existing phone utilities) receive Portuguese copy. Every other or unknown country receives English copy.

## Message rules

The eight supplied templates remain the source copy, including their emoji, map links, and paragraph breaks. The effective card time (`overrideTime`, then `displayTime`, then `time`) is inserted in 24-hour `HH:mm` form. The airport Entrega opening line will also include the effective time so all confirmation messages meet the requirement to state it.

## Architecture

`App` owns one session-only boolean and exposes it only through the existing admin boundary. The value and toggle callback are passed to `AppHeaderMenu`; the enabled value is also passed through `ServiceWorkspace` and `ServicePane` to `ServiceItemCard`.

A focused helper module owns eligibility, template selection, time substitution, and WhatsApp URL composition. `ServiceItemCard` continues to render the link but asks the helper for the final href when confirmation mode is enabled. This keeps long business copy out of the visual component and allows direct coverage of every message branch.

## Safety and fallback behavior

- Staff users never see or activate the switch.
- Invalid phone numbers remain plain text, as today.
- Unknown locations, missing locations, and non-airport/non-office locations never receive prefilled copy.
- Unknown phone countries fall back to English.
- If no usable service time exists, the helper does not attach a confirmation message, avoiding misleading copy.
- No database, permissions, or remote configuration changes are required.

## Testing

Unit tests cover all eight service/location/language template combinations, exact URL encoding and paragraph structure, effective-time precedence, unsupported locations, missing times, and unknown-country English fallback. Component tests cover default plain links, enabled eligible links, and admin-only pill rendering and interaction.
