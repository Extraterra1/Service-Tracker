function normalizePlateSearch(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getFuzzyScore(value, query) {
  if (!query) return 0;
  if (value === query) return 0;
  if (value.startsWith(query)) return 10 + value.length - query.length;
  const contiguousIndex = value.indexOf(query);
  if (contiguousIndex >= 0) return 30 + contiguousIndex + value.length - query.length;

  let queryIndex = 0;
  let previousMatchIndex = -1;
  let gapCount = 0;
  for (let valueIndex = 0; valueIndex < value.length && queryIndex < query.length; valueIndex += 1) {
    if (value[valueIndex] !== query[queryIndex]) continue;
    if (previousMatchIndex >= 0) gapCount += valueIndex - previousMatchIndex - 1;
    previousMatchIndex = valueIndex;
    queryIndex += 1;
  }
  return queryIndex === query.length ? 100 + gapCount + value.length - query.length : null;
}

export function rankPlateOptions(plateOptions, query) {
  const normalizedQuery = normalizePlateSearch(query);
  return plateOptions
    .map((option) => ({ option, score: getFuzzyScore(normalizePlateSearch(option.label || option.value), normalizedQuery) }))
    .filter((entry) => entry.score !== null)
    .sort((left, right) => left.score - right.score || left.option.label.localeCompare(right.option.label))
    .map((entry) => entry.option);
}
