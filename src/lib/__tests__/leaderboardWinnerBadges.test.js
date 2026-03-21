import { describe, expect, it } from 'vitest';
import { getLatestUpdateIdentityKey, getTopRankIdentityKeys } from '../leaderboardWinnerBadges';

describe('leaderboardWinnerBadges', () => {
  it('returns identity keys for every tied first-place winner', () => {
    const keys = getTopRankIdentityKeys([
      { rank: 1, uid: 'uid-cristina', email: 'cristina@example.com', displayName: 'Cristina' },
      { rank: 1, uid: 'uid-ana', email: 'ana@example.com', displayName: 'Ana' },
      { rank: 3, uid: 'uid-carlos', email: 'carlos@example.com', displayName: 'Carlos' },
    ]);

    expect(keys.has('uid:uid-cristina')).toBe(true);
    expect(keys.has('uid:uid-ana')).toBe(true);
    expect(keys.has('uid:uid-carlos')).toBe(false);
  });

  it('keeps fallback email and name keys for winners when the live updater has no uid', () => {
    const keys = getTopRankIdentityKeys([
      { rank: 1, uid: 'uid-cristina', email: 'cristina@example.com', displayName: 'Cristina' },
    ]);

    expect(keys.has('uid:uid-cristina')).toBe(true);
    expect(keys.has('email:cristina@example.com')).toBe(true);
    expect(keys.has('name:cristina')).toBe(true);
  });

  it('uses the most recent updater identity across status, ready, and manual time changes', () => {
    const key = getLatestUpdateIdentityKey({
      item: {
        updatedAt: new Date('2026-03-20T09:30:00.000Z'),
        updatedByUid: 'uid-marta',
        updatedByName: 'Marta',
        updatedByEmail: 'marta@example.com',
      },
      status: {
        updatedAt: new Date('2026-03-20T09:10:00.000Z'),
        updatedByUid: 'uid-cristina',
        updatedByName: 'Cristina',
        updatedByEmail: 'cristina@example.com',
      },
      readyState: {
        updatedAt: new Date('2026-03-20T09:20:00.000Z'),
        updatedByUid: 'uid-ana',
        updatedByName: 'Ana',
        updatedByEmail: 'ana@example.com',
      },
    });

    expect(key).toBe('uid:uid-marta');
  });
});
