import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServicePane from '../ServicePane';

const ONE_HOUR_MS = 60 * 60 * 1000;

function createServiceItem(overrides = {}) {
  return {
    itemId: 'item-1',
    id: 'reservation-1',
    name: 'Cliente Teste',
    serviceType: 'pickup',
    time: '09:30',
    plate: '',
    ...overrides
  };
}

function renderPane({ items = [createServiceItem()], statusMap = {}, readyMap = {} } = {}) {
  return render(
    <ServicePane
      title="Entregas"
      items={items}
      statusMap={statusMap}
      readyMap={readyMap}
      sharedPlateMarkers={{}}
      onSharedPlateTap={vi.fn()}
      onToggleDone={vi.fn()}
      onToggleReady={vi.fn()}
      onSaveTimeOverride={vi.fn()}
      disabled={false}
      loading={false}
      canShowEmptyState
      lockedMessage=""
    />
  );
}

describe('ServicePane completed rollover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('schedules a single timeout for the next completed rollover and moves the item after the threshold', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const item = createServiceItem();

    renderPane({
      items: [item],
      statusMap: {
        [item.itemId]: {
          done: true,
          updatedAt: new Date(Date.now() - ONE_HOUR_MS + 1000).toISOString()
        }
      }
    });

    expect(screen.queryByText('Finalizados (1)')).not.toBeInTheDocument();
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy.mock.calls[0][1]).toBe(1000);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Finalizados (1)')).toBeInTheDocument();
  });
});
