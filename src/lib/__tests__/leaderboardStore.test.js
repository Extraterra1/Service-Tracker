import { describe, expect, it } from 'vitest';
import { ALL_TIME_LIMIT, applySharedRanks, buildLeaderboardRows, getLeaderboardRange } from '../leaderboardStore';

function formatInMadeira(date, options) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Atlantic/Madeira',
    ...options,
  }).format(date);
}

describe('leaderboardStore', () => {
  it('scores only the first status completion per date+item and ignores undo toggles', () => {
    const entries = [
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:00:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
      },
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:01:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: false,
      },
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:02:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
      },
      {
        actionType: 'time_change',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:03:00.000Z'),
      },
    ];

    const result = buildLeaderboardRows(entries);

    expect(result.totalActions).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].score).toBe(2);
  });

  it('deduplicates completion scoring globally across users for the same date+item', () => {
    const result = buildLeaderboardRows([
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:00:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
        __entryId: 'entry-a',
      },
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-2',
        updatedByName: 'Ana',
        createdAt: new Date('2026-03-02T09:01:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
        __entryId: 'entry-b',
      },
    ]);

    expect(result.totalActions).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].uid).toBe('uid-1');
    expect(result.rows[0].score).toBe(1);
  });

  it('allows one completion point per date even when itemId repeats across dates', () => {
    const result = buildLeaderboardRows([
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:00:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
      },
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-03T09:00:00.000Z'),
        date: '2026-03-03',
        itemId: 'item-1',
        done: true,
      },
    ]);

    expect(result.totalActions).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].score).toBe(2);
  });

  it('counts ready/time actions and ignores unknown actions', () => {
    const result = buildLeaderboardRows([
      {
        actionType: 'ready_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:00:00.000Z'),
      },
      {
        actionType: 'time_change',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:01:00.000Z'),
      },
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:02:00.000Z'),
        date: '2026-03-02',
        itemId: 'item-1',
        done: false,
      },
      {
        actionType: 'unknown_action',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt: new Date('2026-03-02T09:03:00.000Z'),
      },
    ]);

    expect(result.totalActions).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].score).toBe(2);
  });

  it('uses __entryId to break ties for same-timestamp status completions', () => {
    const createdAt = new Date('2026-03-02T09:00:00.000Z');
    const result = buildLeaderboardRows([
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-1',
        updatedByName: 'Carlos',
        createdAt,
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
        __entryId: 'entry-b',
      },
      {
        actionType: 'status_toggle',
        updatedByUid: 'uid-2',
        updatedByName: 'Ana',
        createdAt,
        date: '2026-03-02',
        itemId: 'item-1',
        done: true,
        __entryId: 'entry-a',
      },
    ]);

    expect(result.totalActions).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].uid).toBe('uid-2');
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

  it('weekly range can target a previous week from the provided anchor date', () => {
    const now = new Date('2026-02-25T12:45:00.000Z'); // Wednesday in the previous week
    const range = getLeaderboardRange('weekly', now, 'Atlantic/Madeira');
    const startDate = range.startAt.toDate();
    const endDate = range.endAt.toDate();

    expect(formatInMadeira(startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('23/02/2026');
    expect(formatInMadeira(endDate, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('02/03/2026');
  });

  it('monthly range starts on day 1 at 00:00 in Madeira timezone', () => {
    const now = new Date('2026-03-18T15:20:00.000Z');
    const range = getLeaderboardRange('monthly', now, 'Atlantic/Madeira');
    const startDate = range.startAt.toDate();

    expect(formatInMadeira(startDate, { day: '2-digit' })).toBe('01');
    expect(formatInMadeira(startDate, { hour: '2-digit', minute: '2-digit', hour12: false })).toBe('00:00');
  });

  it('monthly range can target a previous month from the provided anchor date', () => {
    const now = new Date('2026-02-18T15:20:00.000Z');
    const range = getLeaderboardRange('monthly', now, 'Atlantic/Madeira');
    const startDate = range.startAt.toDate();
    const endDate = range.endAt.toDate();

    expect(formatInMadeira(startDate, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('01/02/2026');
    expect(formatInMadeira(endDate, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('01/03/2026');
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
        actionType: 'ready_toggle',
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
