import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

function createItem(overrides = {}) {
  return {
    itemId: 'item-1',
    serviceType: 'pickup',
    id: 'RES-001',
    name: 'Cliente Teste',
    time: '09:30',
    plate: 'AA-00-AA',
    car: 'Skoda Fabia',
    location: 'Pico do Fogo',
    ...overrides
  };
}

describe('ServiceItemCard car-history click', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens history when clicking the car model and does not affect plate-ready toggle', async () => {
    const user = userEvent.setup();
    const onOpenCarHistoryFromModel = vi.fn();
    const onToggleReady = vi.fn();

    render(
      <ServiceItemCard
        item={createItem()}
        status={{}}
        readyState={{ ready: false }}
        sharedPlateMarkers={{}}
        onToggleDone={vi.fn()}
        onToggleReady={onToggleReady}
        onSaveTimeOverride={vi.fn()}
        onOpenCarHistoryFromModel={onOpenCarHistoryFromModel}
        disabled={false}
        isUpdating={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Abrir histórico da viatura Skoda Fabia' }));
    expect(onOpenCarHistoryFromModel).toHaveBeenCalledWith('AA-00-AA');

    await user.click(screen.getByRole('button', { name: /Marcar viatura AA-00-AA como pronta/ }));
    expect(onToggleReady).toHaveBeenCalledTimes(1);
  });
});

