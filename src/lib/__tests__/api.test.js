import { describe, expect, it } from 'vitest';
import { normalizeServiceDay } from '../api';

describe('normalizeServiceDay', () => {
  it('decodes an HTML-encoded ampersand in a service address', () => {
    const result = normalizeServiceDay({
      date: '2026-07-26',
      pickups: [{ id: '123', name: 'Smith &amp; Jones', location: 'Hotel Pestana &amp; Casino' }],
      returns: []
    });

    expect(result.pickups[0].location).toBe('Hotel Pestana & Casino');
    expect(result.pickups[0].name).toBe('Smith &amp; Jones');
  });
});
