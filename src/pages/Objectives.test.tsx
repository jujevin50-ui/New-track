import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import Objectives from './Objectives';

const mock = vi.hoisted(() => ({
  updateRow: vi.fn(),
  objectives: [
    { id: 'plan', title: 'Relire mon plan', note: '', completed: false },
    { id: 'journal', title: 'Tenir mon journal', note: '', completed: false },
  ],
}));

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({ data: { objectives: mock.objectives }, updateRow: mock.updateRow }),
}));
vi.mock('@/hooks/useDailyJournal', () => ({ useDailyJournal: () => ({ journals: [] }) }));
vi.mock('@/hooks/useTrades', () => ({ useTrades: () => ({ allTrades: [] }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  mock.updateRow.mockReset();
  mock.objectives.forEach(objective => { objective.completed = false; });
});

it('shows completion immediately and restores the saved state if the failed write is abandoned', async () => {
  vi.useFakeTimers();
  const errors = vi.spyOn(toast, 'error');
  let failWrite = () => {};
  mock.updateRow.mockImplementationOnce(() => new Promise<void>((_, reject) => {
    failWrite = () => reject(new Error('Disque indisponible'));
  }));
  render(<Objectives />);
  const checkbox = screen.getByRole('checkbox', { name: /Relire mon plan/ });

  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
  expect(screen.getByRole('checkbox', { name: /Tenir mon journal/ })).toBeEnabled();
  expect(mock.updateRow).not.toHaveBeenCalled();

  await act(async () => { await vi.advanceTimersByTimeAsync(32); });
  expect(mock.updateRow).toHaveBeenCalledWith('objectives', 'plan', { completed: true });
  expect(checkbox).toBeChecked();
  await act(async () => { failWrite(); });
  const discard = errors.mock.calls[0]?.[1]?.cancel;
  expect(discard).toBeDefined();
  render(<>{discard}</>);
  fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(checkbox).not.toBeChecked();
  expect(checkbox).toBeEnabled();

  mock.updateRow.mockImplementationOnce(async () => { mock.objectives[0].completed = true; });
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
  await act(async () => { await vi.advanceTimersByTimeAsync(32); });
  expect(checkbox).toBeChecked();
  expect(checkbox).toBeEnabled();
});
