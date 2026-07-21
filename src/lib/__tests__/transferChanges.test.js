import { describe, expect, it } from 'vitest';
import { applyTransferChanges } from '../dateCollectionsMaps';

describe('applyTransferChanges', () => {
  it('normalizes transfer entries and preserves unchanged map references', () => {
    const updatedAt = { seconds: 10 };
    const previous = {
      itemA: {
        transferred: true,
        plate: 'AA-00-AA',
        updatedAt,
        updatedByName: 'Ana',
        updatedByEmail: 'ana@example.com'
      }
    };

    const next = applyTransferChanges(previous, [{
      changeType: 'modified',
      itemId: 'itemA',
      transfer: previous.itemA
    }]);

    expect(next).toBe(previous);
  });

  it('toggles transfer values, preserves other entries, and removes deleted entries', () => {
    const previous = {
      itemA: { transferred: false, plate: 'AA-00-AA' },
      itemB: { transferred: true, plate: 'BB-00-BB' }
    };

    const toggled = applyTransferChanges(previous, [{
      changeType: 'modified',
      itemId: 'itemA',
      transfer: {
        transferred: true,
        plate: ' AA-00-AA ',
        updatedByName: 'Bruno',
        updatedByEmail: 'bruno@example.com'
      }
    }]);

    expect(toggled).not.toBe(previous);
    expect(toggled.itemA).toMatchObject({
      transferred: true,
      plate: 'AA-00-AA',
      updatedByName: 'Bruno',
      updatedByEmail: 'bruno@example.com'
    });
    expect(toggled.itemB).toBe(previous.itemB);

    const removed = applyTransferChanges(toggled, [{ changeType: 'removed', itemId: 'itemA' }]);
    expect(removed).toEqual({ itemB: previous.itemB });
  });
});
