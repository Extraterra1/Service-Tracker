# Recolha Transfer Status Design

## Problem

Completed recolhas currently show that the collection work is done, but they do not show whether the returned car is still awaiting transfer or has already been transferred.

## Goal

Make a completed recolha's license plate act like the delivery-side car-ready control: red means awaiting transfer, green means transferred, and tapping toggles between those states. An incomplete recolha remains unhighlighted and non-interactive. Undoing a recolha resets its transfer state.

## Architecture

Add a dedicated `service_transfer/{date}_{itemId}` overlay for recolha transfer state. This parallels `service_ready` without conflating delivery readiness with return transfer status. Each record stores the date, item identity, plate, `transferred` boolean, timestamp, and updater identity.

Subscribe to the selected day's transfer records in `useDateCollections`, merge snapshot changes into a `transferMap`, and pass the relevant entry through the service workspace to each card. A card derives its presentation from both maps: incomplete recolhas have no transfer styling or action; completed recolhas show red when `transferred` is false and green when true.

## Mutations and Reset Behavior

A plate tap on a completed recolha toggles `transferred` in `service_transfer` and appends a `transfer_toggle` entry to `service_activity` in one batch. Taps on incomplete recolhas do nothing.

When a recolha is marked undone, the status write also sets its transfer record to `transferred: false` in the same batch. The UI additionally gates all transfer styling on `done === true`, so the highlight disappears as soon as the status update arrives. Marking the recolha done again therefore starts in red.

The automatic reset is represented by the existing `status_toggle` undo activity entry; it does not create a second transfer activity entry or score a second point.

## Activity, Leaderboard, and Audit Attribution

`transfer_toggle` is a validated activity action containing the new transfer value and plate. Every direct transfer tap scores one leaderboard point, matching `ready_toggle`. Activity UI copy distinguishes cars marked as transferred from cars returned to awaiting-transfer state.

Transfer timestamps and updater identity participate in the card's latest-update footer so the most recent user action is attributed consistently with status, time, and ready changes.

## Security Rules

Firestore rules allow active staff to read transfer records and create or update only current-Madeira-day documents whose ID matches `{date}_{itemId}`. Records must use `serviceType == "return"`, include a non-empty plate, a boolean `transferred`, a timestamp, and the authenticated updater UID. Activity validation permits `transfer_toggle` only for return items with the required transfer fields.

## Testing

Add test-first coverage for:

- transfer snapshot map normalization and updates;
- transfer store validation and batched source/activity payloads;
- Firestore transfer and activity rule constraints;
- incomplete recolha plates being inert and unhighlighted;
- completed recolhas rendering red before transfer and green after transfer;
- red/green toggle callbacks and accessible labels;
- undoing a recolha resetting persisted transfer state;
- transfer activity formatting and leaderboard scoring;
- latest-update audit attribution and memoization dependencies.

