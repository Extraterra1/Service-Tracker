import { describe, expect, it } from 'vitest';
import { applyTimeOverrideChanges } from '../dateCollectionsMaps';

describe('applyTimeOverrideChanges', () => {
  it('returns same map when override payload did not change', () => {
    const updatedAt = new Date('2026-02-20T12:00:00.000Z');
    const previous = {
      itemA: {
        overrideTime: '14:30',
        originalTime: '13:30',
        updatedAt,
        updatedByName: 'Carlos',
        updatedByEmail: 'carlos@test.com'
      }
    };

    const next = applyTimeOverrideChanges(previous, [
      {
        changeType: 'modified',
        itemId: 'itemA',
        override: {
          overrideTime: '14:30',
          originalTime: '13:30',
          updatedAt,
          updatedByName: 'Carlos',
          updatedByEmail: 'carlos@test.com'
        }
      }
    ]);

    expect(next).toBe(previous);
  });

  it('updates override entry with new time value', () => {
    const previous = {
      itemA: {
        overrideTime: '14:30',
        originalTime: '13:30',
        updatedAt: new Date('2026-02-20T12:00:00.000Z'),
        updatedByName: 'Carlos',
        updatedByEmail: 'carlos@test.com'
      }
    };

    const next = applyTimeOverrideChanges(previous, [
      {
        changeType: 'modified',
        itemId: 'itemA',
        override: {
          overrideTime: '15:00',
          originalTime: '13:30',
          updatedAt: new Date('2026-02-20T12:10:00.000Z'),
          updatedByName: 'Carlos',
          updatedByEmail: 'carlos@test.com'
        }
      }
    ]);

    expect(next).not.toBe(previous);
    expect(next.itemA.overrideTime).toBe('15:00');
  });
});
