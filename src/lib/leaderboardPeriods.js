export const DEFAULT_LEADERBOARD_TIME_ZONE = 'Atlantic/Madeira';

const WEEKDAY_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getFormatter(timeZone, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone, ...options });
}

function getDatePart(parts, type) {
  return Number(parts.find((part) => part.type === type)?.value ?? '0');
}

function toDateValue(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function getZonedDateParts(value, timeZone) {
  const date = toDateValue(value);
  const parts = getFormatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: getDatePart(parts, 'year'),
    month: getDatePart(parts, 'month'),
    day: getDatePart(parts, 'day'),
  };
}

function getZonedWeekdayIndex(value, timeZone) {
  const date = toDateValue(value);
  const label = getFormatter(timeZone, { weekday: 'short' }).format(date);
  return WEEKDAY_INDEX[label] ?? 1;
}

function shiftDateParts({ year, month, day }, deltaDays) {
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function shiftMonthParts({ year, month }, deltaMonths) {
  const shifted = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: 1,
  };
}

function getTimeZoneOffsetMinutes(value, timeZone) {
  const date = toDateValue(value);
  const parts = getFormatter(timeZone, {
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const offsetLabel = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] ?? '0');
  const minutes = Number(match[3] ?? '0');

  return sign * (hours * 60 + minutes);
}

function zonedDateTimeToUtcMs({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const initialOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  const adjusted = utcGuess - initialOffset * 60_000;
  const adjustedOffset = getTimeZoneOffsetMinutes(new Date(adjusted), timeZone);

  if (adjustedOffset === initialOffset) {
    return adjusted;
  }

  return utcGuess - adjustedOffset * 60_000;
}

function formatWeeklyWindowLabel(startDate, endDate, timeZone) {
  const weeklyFormatter = new Intl.DateTimeFormat('pt-PT', {
    timeZone,
    day: '2-digit',
    month: 'short',
  });
  const inclusiveEndDate = new Date(endDate.getTime() - 1);

  return `${weeklyFormatter.format(startDate)} - ${weeklyFormatter.format(inclusiveEndDate)}`;
}

function formatMonthlyWindowLabel(startDate, timeZone) {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(startDate);
}

export function normalizeLeaderboardPeriod(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'weekly' || normalized === 'monthly' || normalized === 'all_time') {
    return normalized;
  }

  return 'weekly';
}

export function getLeaderboardPeriodWindow(periodInput, nowInput = new Date(), timeZone = DEFAULT_LEADERBOARD_TIME_ZONE) {
  const period = normalizeLeaderboardPeriod(periodInput);
  const now = toDateValue(nowInput);

  if (period === 'all_time') {
    return {
      period,
      timeZone,
      startDate: null,
      endDate: null,
      tabLabel: 'All time',
      windowLabel: 'Todos os registos',
      cacheKey: 'all_time',
    };
  }

  const todayParts = getZonedDateParts(now, timeZone);
  let startParts;
  let endParts;

  if (period === 'weekly') {
    const weekday = getZonedWeekdayIndex(now, timeZone);
    const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
    startParts = shiftDateParts(todayParts, offsetToMonday);
    endParts = shiftDateParts(startParts, 7);
  } else {
    startParts = { year: todayParts.year, month: todayParts.month, day: 1 };
    endParts = shiftMonthParts(startParts, 1);
  }

  const startDate = new Date(zonedDateTimeToUtcMs(startParts, timeZone));
  const endDate = new Date(zonedDateTimeToUtcMs(endParts, timeZone));

  return {
    period,
    timeZone,
    startDate,
    endDate,
    tabLabel: period === 'weekly' ? 'Semana' : 'Mês',
    windowLabel: period === 'weekly' ? formatWeeklyWindowLabel(startDate, endDate, timeZone) : formatMonthlyWindowLabel(startDate, timeZone),
    cacheKey: `${period}:${startDate.getTime()}:${endDate.getTime()}`,
  };
}

export function getLeaderboardCacheKey(periodInput, nowInput = new Date(), timeZone = DEFAULT_LEADERBOARD_TIME_ZONE) {
  return getLeaderboardPeriodWindow(periodInput, nowInput, timeZone).cacheKey;
}

export function shiftLeaderboardAnchor(periodInput, nowInput = new Date(), delta = 0, timeZone = DEFAULT_LEADERBOARD_TIME_ZONE) {
  const period = normalizeLeaderboardPeriod(periodInput);
  const anchor = toDateValue(nowInput);

  if (period === 'all_time' || delta === 0) {
    return anchor;
  }

  const window = getLeaderboardPeriodWindow(period, anchor, timeZone);
  if (!window.startDate) {
    return anchor;
  }

  if (period === 'weekly') {
    const shiftedDate = new Date(window.startDate.getTime());
    shiftedDate.setUTCDate(shiftedDate.getUTCDate() + delta * 7);
    return shiftedDate;
  }

  const startParts = getZonedDateParts(window.startDate, timeZone);
  const shiftedMonth = shiftMonthParts(startParts, delta);
  return new Date(zonedDateTimeToUtcMs(shiftedMonth, timeZone));
}

export function canNavigateLeaderboardPeriodForward(
  periodInput,
  nowInput = new Date(),
  referenceNow = new Date(),
  timeZone = DEFAULT_LEADERBOARD_TIME_ZONE
) {
  const period = normalizeLeaderboardPeriod(periodInput);
  if (period === 'all_time') {
    return false;
  }

  const selectedWindow = getLeaderboardPeriodWindow(period, nowInput, timeZone);
  const currentWindow = getLeaderboardPeriodWindow(period, referenceNow, timeZone);

  return selectedWindow.startDate.getTime() < currentWindow.startDate.getTime();
}
