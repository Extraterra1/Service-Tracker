function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeFlightNumber(value) {
  return typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '') : '';
}

export function parseFlightArrivalsRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { success: false };
  if (typeof input.arrivalDate !== 'string' || !isValidDate(input.arrivalDate)) return { success: false };
  if (!Array.isArray(input.flightNumbers) || input.flightNumbers.length < 1 || input.flightNumbers.length > 20) {
    return { success: false };
  }

  const flightNumbers = input.flightNumbers.map(normalizeFlightNumber);
  if (flightNumbers.some((value) => !/^[A-Z0-9]{3,12}$/.test(value))) return { success: false };

  return {
    success: true,
    data: { arrivalDate: input.arrivalDate, flightNumbers },
  };
}

export function createFlightArrivalsHandler({
  HttpsErrorClass,
  getStaffAllowlist,
  getArrivals,
  logError,
}) {
  return async function flightArrivalsHandler(request) {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsErrorClass('unauthenticated', 'Authentication is required.');

    const allowlistUser = await getStaffAllowlist(uid);
    if (!allowlistUser.exists || allowlistUser.active !== true) {
      throw new HttpsErrorClass('permission-denied', 'Active staff access is required.');
    }

    const parsed = parseFlightArrivalsRequest(request.data);
    if (!parsed.success) throw new HttpsErrorClass('invalid-argument', 'Invalid flight arrivals request.');

    try {
      return await getArrivals(parsed.data);
    } catch (error) {
      logError('Flight arrivals lookup failed', {
        errorType: typeof error?.name === 'string' ? error.name : 'UnknownError',
      });
      throw new HttpsErrorClass('internal', 'Flight arrivals are temporarily unavailable.');
    }
  };
}
