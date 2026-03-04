import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

vi.mock('motion/react', () => ({
  motion: {
    article: ({ children, layout, className = '' }) => (
      <article data-testid="service-item-card" data-layout={String(layout)} className={className}>
        {children}
      </article>
    ),
  },
}));

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

function renderCard() {
  render(
    <ServiceItemCard
      item={createItem()}
      status={{ done: false }}
      readyState={undefined}
      sharedPlateMarkers={{}}
      onToggleDone={vi.fn()}
      onToggleReady={vi.fn()}
      onSaveTimeOverride={vi.fn().mockResolvedValue(true)}
      onSharedPlateTap={vi.fn()}
      disabled={false}
      isUpdating={false}
    />
  );
}

describe('ServiceItemCard time menu layout behavior', () => {
  it('keeps motion layout animation disabled while opening the time menu', async () => {
    const user = userEvent.setup();
    renderCard();

    const card = screen.getByTestId('service-item-card');
    expect(card).toHaveAttribute('data-layout', 'false');

    await user.click(screen.getByRole('button', { name: 'Editar hora' }));

    expect(card).toHaveAttribute('data-layout', 'false');
  });
});
