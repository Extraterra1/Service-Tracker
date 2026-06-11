# Firestore Access Requests Design

## Goal

Replace Telegram-dependent access approval with an in-app, Firestore-only workflow.

## User Experience

Active staff get an "Access Requests" section in the existing menu. The section lists pending users with compact identity details and two actions: approve or deny. When there are no pending requests, the section shows a short empty state.

Signed-in users who are not allowlisted create or refresh their own pending request directly in Firestore. Their access gate remains the same pending/denied/blocked screen, but it no longer depends on Cloud Functions or Telegram.

## Data Flow

- Non-staff signed-in users create/update `access_requests/{uid}` with status `pending`.
- Active staff subscribe to pending requests from `access_requests`.
- Approving a request writes `staff_allowlist/{uid}` and updates the request to `approved`.
- Denying a request updates the request to `denied`.
- Blocking stays out of this pass.

## Firestore Rules

- Users can read their own request.
- Users can create/update their own safe pending request fields only.
- Active staff can read/list access requests.
- Active staff can approve or deny requests using constrained request fields.
- Active staff can create/update allowlist docs with constrained fields.

## UI

The menu section follows the existing accordion system. It uses compact rows, small metadata, and existing button styles so it does not compete with the service list.

## Testing

- Unit tests for access request creation, subscription mapping, approve, and deny writes.
- Firestore rules tests for self-request, staff list/read, staff approve/deny, and non-staff denial.
- Menu UI tests for rendering pending requests and invoking approve/deny.
