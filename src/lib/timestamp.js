export function toDateValue(timestampLike) {
  if (!timestampLike) {
    return null;
  }

  if (typeof timestampLike.toDate === 'function') {
    return timestampLike.toDate();
  }

  if (typeof timestampLike.seconds === 'number') {
    return new Date(timestampLike.seconds * 1000);
  }

  const parsed = new Date(timestampLike);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function toTimestampMs(timestampLike, fallback = 0) {
  const parsed = toDateValue(timestampLike);
  return parsed ? parsed.getTime() : fallback;
}
