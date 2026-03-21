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

function renderCard({
  onSaveTimeOverride = vi.fn().mockResolvedValue(true),
  item = createItem(),
  status = { done: false },
  readyState = undefined
} = {}) {
  render(
    <ServiceItemCard
      item={item}
      status={status}
      readyState={readyState}
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

function hasFooterText(text) {
  return (_, element) => element?.classList.contains('item-footer') && element.textContent?.includes(text);
}

describe('ServiceItemCard time validation', () => {
  it('uses a native time picker in the clock menu', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));

    const input = screen.getByLabelText('Hora manual no formato 24 horas');
    expect(input).toHaveAttribute('type', 'time');
  });

  it('disables save button when time value is empty', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));

    const input = screen.getByLabelText('Hora manual no formato 24 horas');
    await user.clear(input);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('submits when a valid HH:mm value is entered', async () => {
    const user = userEvent.setup();
    const { onSaveTimeOverride, item } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));

    const input = screen.getByLabelText('Hora manual no formato 24 horas');
    await user.clear(input);
    await user.type(input, '10:30');

    const saveButton = screen.getByRole('button', { name: 'Guardar' });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onSaveTimeOverride).toHaveBeenCalledTimes(1);
    expect(onSaveTimeOverride).toHaveBeenCalledWith(item, '10:30');
  });

  it('shows team update footer when ready state is updated', () => {
    renderCard({
      readyState: {
        ready: true,
        updatedAt: new Date('2026-03-02T09:15:00.000Z'),
        updatedByName: 'Joao',
        updatedByEmail: 'joao@example.com'
      }
    });

    expect(screen.getByText(hasFooterText('Atualizado por Joao'))).toBeInTheDocument();
  });

  it('shows team update footer when manual time override is updated', () => {
    renderCard({
      item: createItem({
        overrideTime: '10:30',
        updatedAt: new Date('2026-03-02T09:20:00.000Z'),
        updatedByName: 'Marta',
        updatedByEmail: 'marta@example.com'
      })
    });

    expect(screen.getByText(hasFooterText('Atualizado por Marta'))).toBeInTheDocument();
  });

  it('disables mutable controls when the selected service date is read-only', async () => {
    const user = userEvent.setup();

    render(
      <ServiceItemCard
        item={createItem()}
        status={{ done: false }}
        readyState={{ ready: false }}
        sharedPlateMarkers={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        onSharedPlateTap={vi.fn()}
        disabled
        isUpdating={false}
      />
    );

    expect(screen.getByRole('checkbox', { name: /marcar carlos como concluído/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Editar hora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /marcar viatura aa-00-aa como pronta/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));
    expect(screen.queryByLabelText('Hora manual no formato 24 horas')).not.toBeInTheDocument();
  });
});
