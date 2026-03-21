import { toTimestampMs } from './timestamp';

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getIdentityKeys(uid, email, name) {
  const keys = [];
  const normalizedUid = String(uid ?? '').trim();
  if (normalizedUid) {
    keys.push(`uid:${normalizedUid}`);
  }

  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) {
    keys.push(`email:${normalizedEmail}`);
  }

  const normalizedName = String(name ?? '').trim().toLowerCase();
  if (normalizedName) {
    keys.push(`name:${normalizedName}`);
  }

  return keys;
}

export function getIdentityKey(uid, email, name) {
  return getIdentityKeys(uid, email, name)[0] ?? '';
}

export function getTopRankIdentityKeys(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return new Set();
  }

  const keys = new Set();

  rows
    .filter((row) => Number(row?.rank) === 1)
    .forEach((row) => {
      getIdentityKeys(row?.uid, row?.email, row?.displayName).forEach((key) => {
        keys.add(key);
      });
    });

  return keys;
}

export function getLatestUpdateIdentityKey({ item, status, readyState }) {
  const statusUpdatedAtMs = toTimestampMs(status?.updatedAt);
  const readyUpdatedAtMs = toTimestampMs(readyState?.updatedAt);
  const overrideUpdatedAtMs = toTimestampMs(item?.updatedAt);
  let latestUpdatedAtMs = statusUpdatedAtMs;
  let latestSource = 'status';

  if (readyUpdatedAtMs > latestUpdatedAtMs) {
    latestUpdatedAtMs = readyUpdatedAtMs;
    latestSource = 'ready';
  }

  if (overrideUpdatedAtMs > latestUpdatedAtMs) {
    latestUpdatedAtMs = overrideUpdatedAtMs;
    latestSource = 'override';
  }

  if (latestUpdatedAtMs <= 0) {
    return '';
  }

  if (latestSource === 'ready') {
    return getIdentityKey(readyState?.updatedByUid, readyState?.updatedByEmail, readyState?.updatedByName);
  }

  if (latestSource === 'override') {
    return getIdentityKey(item?.updatedByUid, item?.updatedByEmail, item?.updatedByName);
  }

  return getIdentityKey(status?.updatedByUid, status?.updatedByEmail, status?.updatedByName);
}
