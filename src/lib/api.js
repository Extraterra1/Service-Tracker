const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function buildUrl(path) {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function fallbackItemId(item, date, serviceType, index) {
  const fingerprint = [date, serviceType, item.id ?? '', item.time ?? '', item.name ?? '', item.car ?? '', item.plate ?? '', String(index)]
    .map((value) => String(value).trim().toLowerCase())
    .join('|');

  return `fallback:${fingerprint}`;
}

function normalizeItems(items, date, serviceType) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => ({
    ...item,
    serviceType: item.serviceType ?? serviceType,
    itemId: item.itemId ?? fallbackItemId(item, date, serviceType, index)
  }));
}

export function normalizeServiceDay({ date, pickups, returns }) {
  return {
    pickups: normalizeItems(pickups, date, 'pickup'),
    returns: normalizeItems(returns, date, 'return')
  };
}

export async function refreshServiceDayViaApi({ date, pin, forceRefresh = false, signal }) {
  if (!date) {
    throw new Error('Date is required.');
  }

  const params = new URLSearchParams({ date });
  if (forceRefresh) {
    params.set('forceRefresh', 'true');
  }

  const response = await fetch(buildUrl(`/getjson?${params.toString()}`), {
    method: 'GET',
    signal,
    headers: {
      ...(pin ? { 'X-PIN': pin } : {})
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error ?? `API error (${response.status})`;
    throw new Error(message);
  }

  const rawData = payload?.data ?? {};

  return normalizeServiceDay({
    date: rawData.date ?? date,
    pickups: rawData.pickups,
    returns: rawData.returns
  });
}

// Backward-compatible alias during migration.
export const fetchServiceDay = refreshServiceDayViaApi;
