import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AnimatedValue } from './AnimatedValue';
import { NumberAnimationContext } from '@/contexts/NumberAnimationContext';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('waits for the introduction, increases and reaches the exact formatted amount', () => {
  vi.useFakeTimers();
  const { rerender } = render(<NumberAnimationContext.Provider value={false}><AnimatedValue value="+1 234,56 €" /></NumberAnimationContext.Provider>);
  act(() => { vi.advanceTimersByTime(1500); });
  expect(screen.getByLabelText(/\+1\s234,56 €/)).toHaveTextContent('+0,00 €');
  rerender(<NumberAnimationContext.Provider value><AnimatedValue value="+1 234,56 €" /></NumberAnimationContext.Provider>);
  act(() => { vi.advanceTimersByTime(300); });
  const intermediate = screen.getByLabelText(/\+1\s234,56 €/).textContent!;
  expect(intermediate).not.toBe('+0,00 €');
  expect(intermediate).not.toBe('+1 234,56 €');
  act(() => { vi.advanceTimersByTime(1200); });
  expect(screen.getByLabelText(/\+1\s234,56 €/).textContent).toBe('+1 234,56 €');
});
it('preserves negative amounts, percentages, integer counts and infinity', () => {
  vi.useFakeTimers();
  render(<><AnimatedValue value="-42,75 €" /><AnimatedValue value="66,7 %" /><AnimatedValue value="12" /><AnimatedValue value="∞" /><AnimatedValue value="—" /><AnimatedValue value="$1,234.50" locale="en-US" /></>);
  act(() => { vi.advanceTimersByTime(1400); });
  for (const value of ['-42,75 €', '66,7 %', '12', '∞', '—', '$1,234.50']) expect(screen.getByLabelText(value).textContent).toBe(value);
});
it('shows final values directly with reduced motion and updates to new data', () => {
  const original = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
  const { rerender } = render(<AnimatedValue value="125,50 €" />);
  expect(screen.getByLabelText('125,50 €').textContent).toBe('125,50 €');
  rerender(<AnimatedValue value="-10,00 €" />);
  expect(screen.getByLabelText('-10,00 €').textContent).toBe('-10,00 €');
});
