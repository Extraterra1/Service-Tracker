# Menu Grouping Design

## Goal

Reduce top-level menu crowding while keeping the two most-used desk-staff actions, Leaderboard and Arquivar Item, immediately accessible.

## Hierarchy

- Arquivar Item remains top-level and expandable.
- Leaderboard remains a top-level action.
- Conta becomes an expandable parent containing:
  - Conta e PIN, retaining its existing expandable controls and diagnostics.
  - Pedidos de Acesso, retaining its expandable access-management UI, admin-only visibility, and pending-count badge.
- Gerir Serviço becomes an expandable parent containing:
  - Alterar Hora, retaining its expandable controls.
  - Atividade, retaining its popup action.
  - Histórico de Viaturas, retaining its popup action.

## Interaction and Presentation

Both parent groups use the menu's existing animated disclosure behavior. Their children remain individually expandable or clickable, so opening a parent does not expose every form at once. Existing permissions, disabled states, callbacks, and compact operational styling remain unchanged.

## Verification

Interaction tests will cover parent expansion, child visibility, nested child behavior, popup actions, and admin-only access controls. The full test suite and production build will be run after implementation.
