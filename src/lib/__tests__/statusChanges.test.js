import { describe, expect, it } from 'vitest';
import { applyStatusChanges } from '../dateCollectionsMaps';

describe('applyStatusChanges', () => {
  it('returns same map reference when no effective change exists', () => {
    const updatedAt = new Date('2026-02-20T10:00:00.000Z');
    const previous = {
      itemA: {
        done: true,
        updatedAt,
        updatedByName: 'Carlos',
        updatedByEmail: 'carlos@test.com'
      }
    };

    const next = applyStatusChanges(previous, [
      {
        changeType: 'modified',
        itemId: 'itemA',
        status: {
          done: true,
          updatedAt,
          updatedByName: 'Carlos',
          updatedByEmail: 'carlos@test.com'
        }
      }
    ]);

    expect(next).toBe(previous);
  });

  it('adds and removes entries correctly', () => {
    const previous = {};
    const created = applyStatusChanges(previous, [
      {
        changeType: 'added',
        itemId: 'itemA',
        status: {
          done: true,
          updatedAt: new Date('2026-02-20T11:00:00.000Z'),
          updatedByName: 'Ana',
          updatedByEmail: 'ana@test.com'
        }
      }
    ]);

    expect(created).not.toBe(previous);
    expect(created.itemA.done).toBe(true);

    const removed = applyStatusChanges(created, [
      {
        changeType: 'removed',
        itemId: 'itemA'
      }
    ]);

    expect(removed.itemA).toBeUndefined();
  });
});
