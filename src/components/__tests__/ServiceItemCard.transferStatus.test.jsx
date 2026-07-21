import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

const item = { itemId: 'return-1', serviceType: 'return', id: 'R1', name: 'Cliente', time: '10:00', plate: 'AA-00-AA', car: 'Fiat' };

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
});
