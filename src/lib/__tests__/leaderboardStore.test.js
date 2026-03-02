import { describe, expect, it } from 'vitest';
import { ALL_TIME_LIMIT, applySharedRanks, buildLeaderboardRows, getLeaderboardRange } from '../leaderboardStore';

function formatInMadeira(date, options) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Atlantic/Madeira',
    ...options,
  }).format(date);
}

describe('leaderboardStore', () => {
  it('counts all action types as one point each', () => {
    const createdAt = new Date('2026-03-02T09:00:00.000Z');
    const entries = [
      { actionType: 'status_toggle', updatedByUid: 'uid-1', updatedByName: 'Carlos', createdAt },
      { actionType: 'time_change', updatedByUid: 'uid-1', updatedByName: 'Carlos', createdAt },
      { actionType: 'ready_toggle', updatedByUid: 'uid-1', updatedByName: 'Carlos', createdAt },
    ];

    const result = buildLeaderboardRows(entries);

    expect(result.totalActions).toBe(3);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].score).toBe(3);
  });

  it('weekly range starts on Monday 00:00 in Madeira timezone', () => {
    const now = new Date('2026-03-04T12:45:00.000Z'); // Wednesday
    const range = getLeaderboardRange('weekly', now, 'Atlantic/Madeira');
    const startDate = range.startAt.toDate();
    const endDate = range.endAt.toDate();

    expect(formatInMadeira(startDate, { weekday: 'short' })).toBe('Mon');
    expect(formatInMadeira(startDate, { hour: '2-digit', minute: '2-digit', hour12: false })).toBe('00:00');
    expect(formatInMadeira(endDate, { weekday: 'short' })).toBe('Mon');
  });

  it('monthly range starts on day 1 at 00:00 in Madeira timezone', () => {
    const now = new Date('2026-03-18T15:20:00.000Z');
    const range = getLeaderboardRange('monthly', now, 'Atlantic/Madeira');
    const startDate = range.startAt.toDate();

    expect(formatInMadeira(startDate, { day: '2-digit' })).toBe('01');
    expect(formatInMadeira(startDate, { hour: '2-digit', minute: '2-digit', hour12: false })).toBe('00:00');
  });

  it('all-time cap is set to 10000 actions', () => {
    expect(ALL_TIME_LIMIT).toBe(10000);
  });

  it('applies shared ranking for tied scores', () => {
    const ranked = applySharedRanks([
      { key: 'u1', score: 7 },
      { key: 'u2', score: 7 },
      { key: 'u3', score: 5 },
    ]);

    expect(ranked.map((entry) => entry.rank)).toEqual([1, 1, 3]);
    expect(ranked.map((entry) => entry.sharedRank)).toEqual([false, true, false]);
  });

  it('falls back to activity identity when profile data is unavailable', () => {
    const result = buildLeaderboardRows([
      {
        updatedByUid: '',
        updatedByName: '',
        updatedByEmail: 'team.member@example.com',
        createdAt: new Date('2026-03-02T10:00:00.000Z'),
      },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].displayName).toBe('team.member');
    expect(result.rows[0].email).toBe('team.member@example.com');
  });
});
