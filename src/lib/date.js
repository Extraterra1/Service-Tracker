const DEFAULT_SERVICE_TIME_ZONE = 'Atlantic/Madeira';

export const CURRENT_DAY_ONLY_MUTATION_ERROR = 'Só é possível alterar o dia atual.';

function getDatePartsInTimeZone(value, timeZone = DEFAULT_SERVICE_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value.');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';

  return { year, month, day };
}

function formatDateParts({ year, month, day }) {
  return `${year}-${month}-${day}`;
}

export function getTodayDate() {
  return getTodayServiceDate();
}

export function getTodayServiceDate(timeZone = DEFAULT_SERVICE_TIME_ZONE) {
  return formatDateParts(getDatePartsInTimeZone(new Date(), timeZone));
}

export function isCurrentServiceDate(dateInput, nowInput = new Date(), timeZone = DEFAULT_SERVICE_TIME_ZONE) {
  return String(dateInput ?? '').trim() === formatDateParts(getDatePartsInTimeZone(nowInput, timeZone));
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateInput, days) {
  const [year, month, day] = dateInput.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function formatDateLabel(dateInput) {
  const [year, month, day] = dateInput.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function formatAuditTimestamp(timestampLike) {
  if (!timestampLike) {
    return '';
  }

  let value = timestampLike;
  if (typeof timestampLike.toDate === 'function') {
    value = timestampLike.toDate();
  } else if (timestampLike.seconds) {
    value = new Date(timestampLike.seconds * 1000);
  } else {
    value = new Date(timestampLike);
  }

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}
