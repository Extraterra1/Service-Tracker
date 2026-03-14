import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

const appCss = readFileSync('src/App.css', 'utf8');

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
    location: 'Rua do Castanheiro 12, Funchal',
    extras: [],
    notes: '',
    ...overrides
  };
}

function renderCard(item = createItem()) {
  render(
    <ServiceItemCard
      item={item}
      status={{ done: false }}
      readyState={{ ready: false }}
      sharedPlateMarkers={{}}
      onToggleDone={vi.fn()}
      onToggleReady={vi.fn()}
      onSaveTimeOverride={vi.fn()}
      onSharedPlateTap={vi.fn()}
      disabled={false}
      isUpdating={false}
    />
  );
}

describe('ServiceItemCard location links', () => {
  it('renders a Google Maps link for regular addresses', () => {
    renderCard();

    const link = screen.getByRole('link', { name: 'Rua do Castanheiro 12, Funchal' });
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Rua%20do%20Castanheiro%2012%2C%20Funchal'
    );
  });

  it('styles location links without underline and with a small hover effect', () => {
    expect(appCss).toMatch(/\.item-location-link\s*{[\s\S]*text-decoration:\s*none;/);
    expect(appCss).toMatch(/\.item-location-link:hover\s*{[\s\S]*opacity:\s*0\.82;/);
  });

  it('keeps the location row itself out of the shared line-through styling', () => {
    expect(appCss).toMatch(/\.service-item \.item-location\s*{[\s\S]*text-decoration-line:\s*none;/);
  });

  it('keeps airport addresses as plain text', () => {
    renderCard(createItem({ location: 'AEROPORTO DA MADEIRA' }));

    expect(screen.getByText('AEROPORTO DA MADEIRA')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'AEROPORTO DA MADEIRA' })).not.toBeInTheDocument();
  });

  it('keeps escritorio addresses as plain text', () => {
    renderCard(createItem({ location: 'Escritório Just Drive' }));

    expect(screen.getByText('Escritório Just Drive')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Escritório Just Drive' })).not.toBeInTheDocument();
  });
});
