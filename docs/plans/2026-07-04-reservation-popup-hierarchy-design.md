# Reservation Popup Hierarchy Design

## Goal

Remove duplicated reservation information and place status and the legacy-system action where they are most useful.

## Layout

The header keeps the reservation reference as the single visible ID and places the formatted status pill immediately beside it. The Reserva section no longer repeats the reference or status, but continues to show origin when available.

The “Ver no Reservations” action sits on the right side of the header, immediately before the close control. It keeps its text label and adds an external-link icon so the destination behavior is explicit without relying on the icon alone.

When status is absent, the header renders no empty pill. Existing status formatting, colors, responsive layout, close behavior, and legacy URL construction remain unchanged.

Percurso follows the operational sequence Entrega, Recolha, Local de entrega, Local de recolha, Duração, then Voo de chegada. Viatura shows Grupo, Matrícula, then a combined Modelo value containing brand and model; Marca is not repeated as a separate row.

The structured `Extras:` block currently embedded in delivery comments is parsed into a dedicated Extras section. Each extra is rendered as a compact pill, while unstructured delivery comments, customer notes, service notes, and return comments remain in the separate Notas section.

The core information architecture is fixed regardless of missing data: Cliente/Reserva, Condutor/Percurso, Viatura/Comercial, then Extras/Notas. Defined fields remain visible with an em-dash placeholder; fully empty Extras and Notas show “Sem extras” and “Sem notas”. Informação adicional may follow the fixed grid but never changes the position of core sections. Viatura uses Modelo, Matrícula, Grupo order.

The header shows a warning pill reading “Não tem taxa IMT” when none of the parsed extras contain `IMT`, case-insensitively. Any matching extra suppresses the warning; a reservation with no extras shows it.

## Testing

Verify the reference appears once, the status appears in the header as a pill, the Reserva section omits ID and Estado, the legacy link is in the header, Percurso/Viatura fields follow the approved order, extras and notes are separated, and both IMT warning states behave correctly.
