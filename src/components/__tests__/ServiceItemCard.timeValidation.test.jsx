import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

function createItem(overrides = {}) {
  return {
    itemId: 'item-1',
    serviceType: 'pickup',
    time: '09:00',
    name: 'Carlos',
    id: '0001',
    phone: '+351900000000',
    car: 'Fiat Panda',
    plate: 'AA-00-AA',
    location: 'AEROPORTO DA MADEIRA',
    extras: [],
    notes: '',
    ...overrides
  };
}

function renderCard({ onSaveTimeOverride = vi.fn().mockResolvedValue(true), item = createItem() } = {}) {
  render(
    <ServiceItemCard
      item={item}
      status={{ done: false }}
      sharedPlateMarkers={{}}
      onToggleDone={vi.fn()}
      onToggleReady={vi.fn()}
      onSaveTimeOverride={onSaveTimeOverride}
      onSharedPlateTap={vi.fn()}
      disabled={false}
      isUpdating={false}
    />
  );

  return { onSaveTimeOverride, item };
}

describe('ServiceItemCard time validation', () => {
  it('disables save button when time format is invalid', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));

    const input = screen.getByRole('textbox', { name: 'Hora manual no formato 24 horas' });
    await user.clear(input);
    await user.type(input, '25:00');

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(screen.getByText('Formato inválido. Usa HH:mm.')).toBeInTheDocument();
  });

  it('submits when a valid HH:mm value is entered', async () => {
    const user = userEvent.setup();
    const { onSaveTimeOverride, item } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));

    const input = screen.getByRole('textbox', { name: 'Hora manual no formato 24 horas' });
    await user.clear(input);
    await user.type(input, '10:30');

    const saveButton = screen.getByRole('button', { name: 'Guardar' });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onSaveTimeOverride).toHaveBeenCalledTimes(1);
    expect(onSaveTimeOverride).toHaveBeenCalledWith(item, '10:30');
  });
});
