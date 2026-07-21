import { describe, expect, it } from 'vitest'
import { getDeliveryDisplayTime, selectNextUnfinished } from '../tvBoard'

const item = (itemId, serviceType, time, extra = {}) => ({ itemId, serviceType, time, ...extra })

describe('selectNextUnfinished', () => {
  it('selects the earliest unfinished item even when it is overdue', () => {
    const items = [item('late', 'pickup', '09:00'), item('next', 'pickup', '11:00')]
    expect(selectNextUnfinished(items, { late: { done: false }, next: { done: false } })).toMatchObject({ itemId: 'late' })
  })

  it('excludes completed items', () => {
    const items = [item('done', 'pickup', '09:00'), item('open', 'pickup', '11:00')]
    expect(selectNextUnfinished(items, { done: { done: true } })).toMatchObject({ itemId: 'open' })
  })

  it('uses overridden times for ordering and puts untimed items last', () => {
    const items = [item('untimed', 'return', ''), item('override', 'return', '13:00', { overrideTime: '08:30' }), item('regular', 'return', '09:00')]
    expect(selectNextUnfinished(items, {})).toMatchObject({ itemId: 'override' })
  })

  it('can select deliveries and recolhas independently from filtered lists', () => {
    const services = [item('delivery', 'pickup', '12:00'), item('return', 'return', '08:00')]
    expect(selectNextUnfinished(services.filter((entry) => entry.serviceType === 'pickup'), {})).toMatchObject({ itemId: 'delivery' })
    expect(selectNextUnfinished(services.filter((entry) => entry.serviceType === 'return'), {})).toMatchObject({ itemId: 'return' })
  })
})

describe('getDeliveryDisplayTime', () => {
  it('uses the matching live flight arrival time', () => {
    const delivery = item('delivery', 'pickup', '12:00', { flightNumber: 'TP 1685' })
    const flights = [{ flightNumber: 'TP1685', arrivalTimeLocal: '2026-07-21T10:42' }]
    expect(getDeliveryDisplayTime(delivery, flights)).toEqual({ time: '10:42', source: 'flight' })
  })

  it('falls back to the reservation override when flight data is unavailable', () => {
    const delivery = item('delivery', 'pickup', '12:00', { overrideTime: '12:30', flightNumber: 'TP1685' })
    expect(getDeliveryDisplayTime(delivery, [])).toEqual({ time: '12:30', source: 'reservation' })
  })
})
