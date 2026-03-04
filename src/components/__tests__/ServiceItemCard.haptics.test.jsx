import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceItemCard from '../ServiceItemCard';

const { triggerMock, WebHapticsMock } = vi.hoisted(() => {
  const triggerMock = vi.fn().mockResolvedValue(undefined);
  const WebHapticsMock = vi.fn(function WebHapticsCtor() {
    return { trigger: triggerMock };
  });
  return { triggerMock, WebHapticsMock };
});

vi.mock('web-haptics', () => ({
  WebHaptics: WebHapticsMock,
}));

beforeEach(() => {
  triggerMock.mockClear();
  WebHapticsMock.mockClear();
});

function renderCard({ done = false } = {}) {
  const item = {
    itemId: 'item-1',
    id: '101',
    name: 'Cliente Teste',
    time: '10:00',
    displayTime: '10:00',
    serviceType: 'pickup',
    plate: '12-AB-34',
    location: 'Funchal',
  };

  const onToggleDone = vi.fn();

  render(
    <ServiceItemCard
      item={item}
      status={{ done }}
      readyState={{ ready: false }}
      sharedPlateMarkers={{}}
      onSharedPlateTap={vi.fn()}
      onToggleDone={onToggleDone}
      onToggleReady={vi.fn()}
      onSaveTimeOverride={vi.fn()}
      isUpdating={false}
      disabled={false}
    />
  );

  return { item, onToggleDone };
}

describe('ServiceItemCard haptics', () => {
  it('triggers success haptic when marking item as done', async () => {
    const user = userEvent.setup();
    const { item, onToggleDone } = renderCard({ done: false });

    await user.click(screen.getByRole('checkbox', { name: /marcar cliente teste como concluído/i }));

    expect(onToggleDone).toHaveBeenCalledWith(item, true);
    expect(WebHapticsMock).toHaveBeenCalledTimes(1);
    expect(triggerMock).toHaveBeenCalledWith('success');
  });

  it('triggers nudge haptic when unmarking done item', async () => {
    const user = userEvent.setup();
    const { item, onToggleDone } = renderCard({ done: true });

    await user.click(screen.getByRole('checkbox', { name: /marcar cliente teste como concluído/i }));

    expect(onToggleDone).toHaveBeenCalledWith(item, false);
    expect(triggerMock).toHaveBeenCalledWith('nudge');
  });
});
