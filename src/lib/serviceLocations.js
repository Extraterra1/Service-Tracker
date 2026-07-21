export function normalizeServiceLocation(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function getServiceLocationKind(location) {
  const normalizedLocation = normalizeServiceLocation(location);
  if (normalizedLocation.includes('aeroporto') || normalizedLocation.includes('airport')) return 'airport';
  if (normalizedLocation.includes('escritorio')) return 'office';
  return '';
}

export function isTransferServiceLocation(location) {
  const kind = getServiceLocationKind(location);
  return kind === 'airport' || kind === 'office';
}
