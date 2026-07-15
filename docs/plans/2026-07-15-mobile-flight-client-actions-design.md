# Mobile Flight Client Actions Design

## Goal

Restore the reservation link and WhatsApp action for clients in the mobile current-flights view without making each client row unnecessarily tall.

## Design

On mobile, the client identity stays at the top-left and a compact horizontal action group occupies the top-right. The WhatsApp action displays only its green icon while retaining its descriptive accessible label. The reservation action continues to show the reservation number and eye icon.

Car and registration details remain on the second row. Desktop behavior and the underlying links are unchanged. Missing or invalid actions retain their existing disabled representation.

## Testing

Add a CSS regression test that confirms current-flight client actions are displayed on mobile, placed in the top-right grid cell, and hide only the visible phone-number span for an active WhatsApp link.
