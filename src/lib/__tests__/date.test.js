import { describe, expect, it, vi, afterEach } from 'vitest';
import { getTodayServiceDate, isCurrentServiceDate } from '../date';

describe('date service-day helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the Atlantic/Madeira current day for today helper', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:30:00.000Z'));

    expect(getTodayServiceDate()).toBe('2026-03-07');
  });

  it('matches the current Madeira service date', () => {
    const now = new Date('2026-03-07T23:45:00.000Z');

    expect(isCurrentServiceDate('2026-03-07', now)).toBe(true);
    expect(isCurrentServiceDate('2026-03-06', now)).toBe(false);
    expect(isCurrentServiceDate('2026-03-08', now)).toBe(false);
  });

  it('accounts for daylight-saving transition days in Atlantic/Madeira', () => {
    const beforeDst = new Date('2026-03-29T00:30:00.000Z');
    const afterDst = new Date('2026-03-29T01:30:00.000Z');

    expect(isCurrentServiceDate('2026-03-29', beforeDst)).toBe(true);
    expect(isCurrentServiceDate('2026-03-29', afterDst)).toBe(true);
    expect(isCurrentServiceDate('2026-03-28', afterDst)).toBe(false);
  });
});
