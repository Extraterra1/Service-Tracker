import { describe, expect, it } from 'vitest';
import { buildCarHistoryData, getCarHistoryRange } from '../carHistoryStore';

describe('carHistoryStore', () => {
  it('builds a 15-day window before and after today', () => {
    expect(getCarHistoryRange('2026-03-13')).toEqual({
      rangeStart: '2026-02-26',
      rangeEnd: '2026-03-28'
    });
  });

  it('builds deduped plate options, applies time overrides, and sorts newest first', () => {
    const history = buildCarHistoryData({
      scrapedDays: [
        {
          date: '2026-03-09',
          pickups: [],
          returns: [
            {
              itemId: 'return-1',
              id: '',
              name: '',
              plate: 'AA 00 AA',
              time: ''
            }
          ]
        },
        {
          date: '2026-03-10',
          pickups: [
            {
              itemId: 'pickup-1',
              id: 'RES-002',
              name: 'Maria',
              plate: 'aa-00-aa',
              time: '09:00'
            }
          ],
          returns: [
            {
              itemId: 'return-2',
              id: 'RET-100',
              name: 'Joao',
              plate: 'BB-11-BB',
              time: '08:00'
            }
          ]
        }
      ],
      timeOverrides: [
        {
          date: '2026-03-10',
          itemId: 'pickup-1',
          overrideTime: '09:30'
        }
      ]
    });

    expect(history.plateOptions).toEqual([
      { value: 'AA00AA', label: 'AA-00-AA' },
      { value: 'BB11BB', label: 'BB-11-BB' }
    ]);

    expect(history.entriesByPlate.AA00AA).toEqual([
      {
        id: '2026-03-10_pickup-1',
        date: '2026-03-10',
        itemId: 'pickup-1',
        serviceType: 'pickup',
        plateKey: 'AA00AA',
        displayPlate: 'AA-00-AA',
        clientName: 'Maria',
        reservationId: 'RES-002',
        effectiveTime: '09:30'
      },
      {
        id: '2026-03-09_return-1',
        date: '2026-03-09',
        itemId: 'return-1',
        serviceType: 'return',
        plateKey: 'AA00AA',
        displayPlate: 'AA 00 AA',
        clientName: 'Cliente sem nome',
        reservationId: 'Sem reserva',
        effectiveTime: '--:--'
      }
    ]);
  });
});
