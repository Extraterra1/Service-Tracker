import { toTimestampMs } from './timestamp';

function normalizeStatusEntry(status) {
  return {
    done: status?.done === true,
    updatedAt: status?.updatedAt ?? null,
    updatedByName: status?.updatedByName ?? '',
    updatedByEmail: status?.updatedByEmail ?? ''
  };
}

function isSameStatusEntry(prevStatus, nextStatus) {
  return (
    (prevStatus?.done ?? false) === (nextStatus?.done ?? false) &&
    (prevStatus?.updatedByName ?? '') === (nextStatus?.updatedByName ?? '') &&
    (prevStatus?.updatedByEmail ?? '') === (nextStatus?.updatedByEmail ?? '') &&
    toTimestampMs(prevStatus?.updatedAt) === toTimestampMs(nextStatus?.updatedAt)
  );
}

export function applyStatusChanges(previousMap, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return previousMap;
  }

  let nextMap = previousMap;
  let hasChanges = false;

  changes.forEach((change) => {
    const baseMap = hasChanges ? nextMap : previousMap;
    const itemId = String(change?.itemId ?? '').trim();
    if (!itemId) {
      return;
    }

    const isRemoved = change.changeType === 'removed';
    if (isRemoved) {
      if (!Object.prototype.hasOwnProperty.call(baseMap, itemId)) {
        return;
      }

      if (!hasChanges) {
        nextMap = { ...previousMap };
        hasChanges = true;
      }

      delete nextMap[itemId];
      return;
    }

    const normalizedStatus = normalizeStatusEntry(change.status);
    const currentStatus = baseMap[itemId];
    const nextStatus =
      currentStatus && toTimestampMs(normalizedStatus.updatedAt) === 0
        ? {
            ...normalizedStatus,
            updatedAt: currentStatus.updatedAt ?? null,
            updatedByName: normalizedStatus.updatedByName || currentStatus.updatedByName || '',
            updatedByEmail: normalizedStatus.updatedByEmail || currentStatus.updatedByEmail || ''
          }
        : normalizedStatus;

    if (isSameStatusEntry(currentStatus, nextStatus)) {
      return;
    }

    if (!hasChanges) {
      nextMap = { ...previousMap };
      hasChanges = true;
    }

    nextMap[itemId] = nextStatus;
  });

  return hasChanges ? nextMap : previousMap;
}

function normalizeTimeOverrideEntry(override) {
  return {
    overrideTime: String(override?.overrideTime ?? '').trim(),
    originalTime: String(override?.originalTime ?? '').trim(),
    updatedAt: override?.updatedAt ?? null,
    updatedByName: override?.updatedByName ?? '',
    updatedByEmail: override?.updatedByEmail ?? ''
  };
}

function isSameTimeOverrideEntry(previousEntry, nextEntry) {
  return (
    (previousEntry?.overrideTime ?? '') === (nextEntry?.overrideTime ?? '') &&
    (previousEntry?.originalTime ?? '') === (nextEntry?.originalTime ?? '') &&
    (previousEntry?.updatedByName ?? '') === (nextEntry?.updatedByName ?? '') &&
    (previousEntry?.updatedByEmail ?? '') === (nextEntry?.updatedByEmail ?? '') &&
    toTimestampMs(previousEntry?.updatedAt) === toTimestampMs(nextEntry?.updatedAt)
  );
}

export function applyTimeOverrideChanges(previousMap, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return previousMap;
  }

  let nextMap = previousMap;
  let hasChanges = false;

  changes.forEach((change) => {
    const baseMap = hasChanges ? nextMap : previousMap;
    const itemId = String(change?.itemId ?? '').trim();
    if (!itemId) {
      return;
    }

    if (change.changeType === 'removed') {
      if (!Object.prototype.hasOwnProperty.call(baseMap, itemId)) {
        return;
      }

      if (!hasChanges) {
        nextMap = { ...previousMap };
        hasChanges = true;
      }

      delete nextMap[itemId];
      return;
    }

    const normalizedEntry = normalizeTimeOverrideEntry(change.override);
    const currentEntry = baseMap[itemId];

    if (isSameTimeOverrideEntry(currentEntry, normalizedEntry)) {
      return;
    }

    if (!hasChanges) {
      nextMap = { ...previousMap };
      hasChanges = true;
    }

    nextMap[itemId] = normalizedEntry;
  });

  return hasChanges ? nextMap : previousMap;
}

function normalizeReadyEntry(ready) {
  return {
    ready: ready?.ready === true,
    plate: String(ready?.plate ?? '').trim(),
    updatedAt: ready?.updatedAt ?? null,
    updatedByName: ready?.updatedByName ?? '',
    updatedByEmail: ready?.updatedByEmail ?? ''
  };
}

function isSameReadyEntry(previousEntry, nextEntry) {
  return (
    (previousEntry?.ready ?? false) === (nextEntry?.ready ?? false) &&
    (previousEntry?.plate ?? '') === (nextEntry?.plate ?? '') &&
    (previousEntry?.updatedByName ?? '') === (nextEntry?.updatedByName ?? '') &&
    (previousEntry?.updatedByEmail ?? '') === (nextEntry?.updatedByEmail ?? '') &&
    toTimestampMs(previousEntry?.updatedAt) === toTimestampMs(nextEntry?.updatedAt)
  );
}

export function applyReadyChanges(previousMap, changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return previousMap;
  }

  let nextMap = previousMap;
  let hasChanges = false;

  changes.forEach((change) => {
    const baseMap = hasChanges ? nextMap : previousMap;
    const itemId = String(change?.itemId ?? '').trim();
    if (!itemId) {
      return;
    }

    if (change.changeType === 'removed') {
      if (!Object.prototype.hasOwnProperty.call(baseMap, itemId)) {
        return;
      }

      if (!hasChanges) {
        nextMap = { ...previousMap };
        hasChanges = true;
      }

      delete nextMap[itemId];
      return;
    }

    const normalizedEntry = normalizeReadyEntry(change.ready);
    const currentEntry = baseMap[itemId];

    if (isSameReadyEntry(currentEntry, normalizedEntry)) {
      return;
    }

    if (!hasChanges) {
      nextMap = { ...previousMap };
      hasChanges = true;
    }

    nextMap[itemId] = normalizedEntry;
  });

  return hasChanges ? nextMap : previousMap;
}
