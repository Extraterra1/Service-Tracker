import { describe, expect, it } from 'vitest';
import { applyReadyChanges } from '../dateCollectionsMaps';

describe('applyReadyChanges', () => {
  it('returns same map when ready payload is unchanged', () => {
    const updatedAt = new Date('2026-02-20T13:00:00.000Z');
    const previous = {
      itemA: {
        ready: true,
        plate: 'AA-00-AA',
        updatedAt,
        updatedByName: 'Joao',
        updatedByEmail: 'joao@test.com'
      }
    };

    const next = applyReadyChanges(previous, [
      {
        changeType: 'modified',
        itemId: 'itemA',
        ready: {
          ready: true,
          plate: 'AA-00-AA',
          updatedAt,
          updatedByName: 'Joao',
          updatedByEmail: 'joao@test.com'
        }
      }
    ]);

    expect(next).toBe(previous);
  });

  it('toggles ready value and preserves other entries', () => {
    const previous = {
      itemA: {
        ready: false,
        plate: 'AA-00-AA',
        updatedAt: new Date('2026-02-20T13:00:00.000Z'),
        updatedByName: 'Joao',
        updatedByEmail: 'joao@test.com'
      },
      itemB: {
        ready: true,
        plate: 'BB-00-BB',
        updatedAt: new Date('2026-02-20T13:05:00.000Z'),
        updatedByName: 'Ana',
        updatedByEmail: 'ana@test.com'
      }
    };

    const next = applyReadyChanges(previous, [
      {
        changeType: 'modified',
        itemId: 'itemA',
        ready: {
          ready: true,
          plate: 'AA-00-AA',
          updatedAt: new Date('2026-02-20T13:10:00.000Z'),
          updatedByName: 'Joao',
          updatedByEmail: 'joao@test.com'
        }
      }
    ]);

    expect(next).not.toBe(previous);
    expect(next.itemA.ready).toBe(true);
    expect(next.itemB).toBe(previous.itemB);
  });
});
