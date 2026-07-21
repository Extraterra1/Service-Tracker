import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

const item = { itemId: 'return-1', serviceType: 'return', id: 'R1', name: 'Cliente', time: '10:00', plate: 'AA-00-AA', car: 'Fiat', location: 'AEROPORTO DA MADEIRA' };

function renderCard(status, transferState, onToggleTransferred = vi.fn()) {
  render(<ServiceItemCard item={item} status={status} transferState={transferState} sharedPlateMarkers={{}} onToggleDone={vi.fn()} onToggleTransferred={onToggleTransferred} onSaveTimeOverride={vi.fn()} />);
  return onToggleTransferred;
}

describe('ServiceItemCard recolha transfer status', () => {
  it('keeps an incomplete recolha plate inert and unhighlighted', () => {
    renderCard({ done: false }, { transferred: true });
    expect(screen.queryByRole('button', { name: /transfer/ })).not.toBeInTheDocument();
    expect(screen.getByText('- AA-00-AA')).toHaveClass('item-plate-text');
  });

  it('shows red awaiting-transfer state and toggles to transferred', async () => {
    const callback = renderCard({ done: true }, { transferred: false });
    const button = screen.getByRole('button', { name: 'Marcar viatura AA-00-AA como transferida' });
    expect(button).toHaveClass('is-awaiting-transfer');
    await userEvent.click(button);
    expect(callback).toHaveBeenCalledWith(item);
  });

  it('shows green transferred state and allows reverting it', () => {
    renderCard({ done: true }, { transferred: true });
    const button = screen.getByRole('button', { name: 'Marcar viatura AA-00-AA como aguardando transferência' });
    expect(button).toHaveClass('is-transferred');
  });

  it('keeps completed recolhas outside airport and office locations inert', () => {
    render(<ServiceItemCard item={{ ...item, location: 'Hotel no Funchal' }} status={{ done: true }} transferState={{ transferred: false }} sharedPlateMarkers={{}} onToggleDone={vi.fn()} onToggleTransferred={vi.fn()} onSaveTimeOverride={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /transfer/ })).not.toBeInTheDocument();
    expect(screen.getByText('- AA-00-AA')).toHaveClass('item-plate-text');
  });

  it('allows completed escritório recolhas to use transfer status', () => {
    render(<ServiceItemCard item={{ ...item, location: 'Escritório Just Drive' }} status={{ done: true }} transferState={{ transferred: false }} sharedPlateMarkers={{}} onToggleDone={vi.fn()} onToggleTransferred={vi.fn()} onSaveTimeOverride={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Marcar viatura AA-00-AA como transferida' })).toHaveClass('is-awaiting-transfer');
  });

  it('uses Postman orange for awaiting transfer and keeps plates out of done line-through styling', () => {
    const appCss = fs.readFileSync(path.resolve(globalThis.process.cwd(), 'src/App.css'), 'utf8');
    expect(appCss).toMatch(/\.item-plate-button\.is-awaiting-transfer\s*\{[\s\S]*?color:\s*#ff6c37;/i);
    expect(appCss).toMatch(/\.service-item\.is-done \.item-carline-model,[\s\S]*?text-decoration-color:\s*var\(--line-through\);/);
    expect(appCss).not.toMatch(/\.service-item\.is-done \.item-carline\s*[,\{]/);
  });
});
