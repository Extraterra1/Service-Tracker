# Shared Plate Return Done Design

**Problem**

When the same car has a recolha and an entrega on the same day, the entrega card already shows the shared-plate icon. It does not currently signal that the matching recolha has already been marked as done.

**Goal**

Show a small checkmark on the shared-plate icon in the entregas list once the paired recolha is marked done.

**Approach**

Keep the existing shared-plate marker pipeline in `src/features/service-workspace/ServiceWorkspace.jsx` and enrich each marker with the done state of the matching recolha. The card already receives the marker map, so `src/components/ServiceItemCard.jsx` can render the extra checkmark only for entrega cards.

This keeps the matching logic centralized around normalized plates, avoids a second parallel lookup prop, and preserves the current popup behavior. The marker remains the single source of truth for shared-plate UI state.

**UI Behavior**

- The repeat/shared-plate icon still shows whenever the same normalized plate exists in both lists for the selected day.
- On entrega cards only, the icon gets a small check badge when the paired recolha status is `done === true`.
- Recolha cards keep the existing icon without the check badge.
- The shared-plate button label should mention that the recolha is concluded when the badge is present.

**Data Flow**

1. `ServiceWorkspace` builds shared markers by normalized plate.
2. While building return-side marker data, it reads `statusMap[returnItemId]?.done`.
3. The marker stores a boolean for recolha completion.
4. `ServiceItemCard` reads that marker and, when the item is an entrega, overlays the visual check badge.

**Testing**

- Add a `ServiceWorkspace` regression test with one entrega and one recolha sharing a plate.
- Mark the recolha as done in `statusMap`.
- Assert the entrega shared-plate button exposes the completed label and the recolha button does not.

**Constraints**

- A plate will not have multiple recolhas on the same day.
- No changes are needed to Firestore writes or data model documents.
