# Reservation Phone Display Format Design

## Goal

Make phone numbers in the reservation showcase easier to scan by separating the country calling code and grouping every subsequent digit left-to-right in blocks of three.

## Behavior

Formatting applies only to the visible `clientPhone` value in the reservation details showcase. A recognized international number such as `+351961339825` displays as `+351 961 339 825`; numbers with more than nine subscriber digits retain every digit, for example `+447700900123` displays as `+44 770 090 012 3`. The underlying WhatsApp destination and accessible label continue to use the original value.

Values that cannot be safely separated into a recognized country calling code remain unchanged. No reservation data is mutated.

## Testing

Focused helper tests cover nine-digit and longer subscriber numbers, plus invalid input. Reservation workspace coverage verifies the formatted text and unchanged WhatsApp URL.
