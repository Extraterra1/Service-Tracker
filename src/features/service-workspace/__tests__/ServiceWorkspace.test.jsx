import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ServiceWorkspace from '../ServiceWorkspace';

describe('ServiceWorkspace', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not install a recurring idle interval', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    render(
      <ServiceWorkspace
        serviceData={{ pickups: [], returns: [] }}
        statusMap={{}}
        readyMap={{}}
        onToggleDone={vi.fn()}
        onToggleReady={vi.fn()}
        onSaveTimeOverride={vi.fn()}
        updatingItemId=""
        disabled={false}
        loading={false}
        canShowEmptyState
        lockedMessage=""
      />
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
