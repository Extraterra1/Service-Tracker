# Mobile Flight Client Layout Design

## Goal

Make current-flight client rows easier to scan on mobile by keeping identity, vehicle details, and actions aligned without truncating useful data.

## Layout

Each client becomes a compact three-row mobile layout. The first row groups the country flag directly with the client name. The second row places car and matrícula side by side while allowing the matrícula to size to its full content. The third row holds WhatsApp and the reservation action.

The reservation action becomes a quiet text link showing `#<reservation id>` with the same eye icon vocabulary used by the main service list. It keeps its accessible label and external destination, but drops the boxed `Reservations` treatment that currently competes with client data.

Desktop retains a single dense row using the same semantic groups. Missing phone, flag, or reservation values continue to render stable placeholders.

## Verification

Component tests will cover the grouped identity, full matrícula, reservation ID, icon, and destination. CSS regression coverage will verify the two-column mobile layout and non-wrapping matrícula.
