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
  return render(
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
  it('renders a WhatsApp link for normalizable phone numbers', () => {
    renderCard(createItem({ phone: '+351 912 345 678' }));

    const link = screen.getByRole('link', { name: 'Abrir conversa no WhatsApp para +351 912 345 678' });
    expect(link).toHaveAttribute('href', 'https://wa.me/351912345678');
  });

  it('defines a mobile-only WhatsApp icon treatment while keeping the flag visible', () => {
    expect(appCss).toMatch(
      /@media \(max-width: 780px\)\s*{[\s\S]*\.item-phone-link-label\s*{[\s\S]*display:\s*none;/
    );
    expect(appCss).toMatch(
      /@media \(max-width: 780px\)\s*{[\s\S]*\.item-phone-link-icon\s*{[\s\S]*display:\s*inline-flex;/
    );
    expect(appCss).toMatch(/\.item-phone-flag\s*{[\s\S]*display:\s*inline-flex;/);
  });

  it('keeps non-normalizable phone numbers as plain text', () => {
    renderCard(createItem({ phone: 'abc123' }));

    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'abc123' })).not.toBeInTheDocument();
  });

  it('renders a Google Maps link for regular addresses', () => {
    const { container } = renderCard();

    const link = screen.getByRole('link', { name: 'Rua do Castanheiro 12, Funchal' });
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Rua%20do%20Castanheiro%2012%2C%20Funchal'
    );
    expect(container.querySelector('.item-location-icon.is-default')).toBeInTheDocument();
  });

  it('styles location links without underline and with a small hover effect', () => {
    expect(appCss).toMatch(/\.item-location-link\s*{[\s\S]*text-decoration:\s*none;/);
    expect(appCss).toMatch(/\.item-location-link:hover\s*{[\s\S]*opacity:\s*0\.82;/);
  });

  it('clamps client names to first and last with middle initials', () => {
    renderCard(createItem({ name: 'Benis Ambroise Pedro' }));

    expect(screen.getByText('Benis A. Pedro')).toBeInTheDocument();
    expect(screen.queryByText('Benis Ambroise Pedro')).not.toBeInTheDocument();
  });

  it('keeps the location row itself out of the shared line-through styling', () => {
    expect(appCss).toMatch(/\.service-item \.item-location\s*{[\s\S]*text-decoration-line:\s*none;/);
  });

  it('applies the shared line-through only to non-phone subline content', () => {
    expect(appCss).toMatch(/\.service-item \.item-subline > :not\(\.item-phone-inline\),[\s\S]*text-decoration-line:\s*line-through;/);
    expect(appCss).toMatch(/\.service-item \.item-phone-inline\s*{[\s\S]*text-decoration-line:\s*none;/);
  });

  it('keeps airport addresses as plain text', () => {
    const { container } = renderCard(createItem({ location: 'AEROPORTO DA MADEIRA' }));

    expect(screen.getByText('aeroporto')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'aeroporto' })).not.toBeInTheDocument();
    expect(container.querySelector('.item-location-icon.is-airport')).toBeInTheDocument();
    expect(container.querySelector('.item-location-icon.is-default')).not.toBeInTheDocument();
  });

  it('keeps escritorio addresses as plain text', () => {
    const { container } = renderCard(createItem({ location: 'Escritório Just Drive' }));

    expect(screen.getByText('Escritório Just Drive')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Escritório Just Drive' })).not.toBeInTheDocument();
    expect(container.querySelector('.item-location-icon.is-office')).toBeInTheDocument();
  });
});
