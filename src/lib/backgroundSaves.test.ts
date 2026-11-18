import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { toast } from 'sonner';
import { hasBackgroundSaves, queueBackgroundSave } from './backgroundSaves';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('keeps queued edits in order when the first write needs a retry', async () => {
  vi.useFakeTimers();
  const errors = vi.spyOn(toast, 'error');
  const writes: string[] = [];
  const first = vi.fn(async () => { writes.push('première'); }).mockRejectedValueOnce(new Error('Disque indisponible'));
  const second = vi.fn(async () => { writes.push('seconde'); });

  queueBackgroundSave(first, 'Première modification en attente');
  queueBackgroundSave(second, 'Seconde modification en attente');
  expect(first).not.toHaveBeenCalled();
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false);
  await vi.advanceTimersByTimeAsync(32);
  expect(first).toHaveBeenCalledOnce();
  expect(second).not.toHaveBeenCalled();
  expect(hasBackgroundSaves()).toBe(true);

  const retry = errors.mock.calls[0]?.[1]?.action;
  if (!retry || typeof retry !== 'object' || !('onClick' in retry)) throw new Error('Réessai indisponible');
  const view = render(createElement('button', { onClick: retry.onClick }, 'Réessayer'));
  fireEvent.click(view.getByRole('button', { name: 'Réessayer' }));
  await vi.advanceTimersByTimeAsync(1);
  expect(first).toHaveBeenCalledTimes(2);
  expect(writes).toEqual(['première', 'seconde']);
  expect(hasBackgroundSaves()).toBe(false);
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true);
});
