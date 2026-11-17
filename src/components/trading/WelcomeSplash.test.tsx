import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WelcomeSplash } from './WelcomeSplash';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.style.overflow = ''; });
it('scrolls motivational phrases and releases the page exactly once', () => {
  vi.useFakeTimers();
  const done = vi.fn();
  const { container } = render(<WelcomeSplash name="Alex" onDone={done} />);
  expect(document.body.style.overflow).toBe('hidden');
  act(() => { vi.advanceTimersByTime(2250); });
  expect(container.querySelector('.welcome-words-reel')).toHaveStyle({ transform: 'translateY(-75%)' });
  expect(screen.getByText('Stay disciplined.')).toBeInTheDocument();
  expect(screen.getByText('Hard work.')).toBeInTheDocument();
  expect(container.querySelector('.welcome-counter-number')).toBeNull();
  expect(done).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1000); });
  expect(done).toHaveBeenCalledTimes(1);
  expect(document.body.style.overflow).toBe('');
  fireEvent.click(screen.getByText('Passer l’animation'));
  expect(done).toHaveBeenCalledTimes(1);
});
it('can be skipped with Escape and cancels pending animation frames', () => {
  vi.useFakeTimers();
  const done = vi.fn();
  render(<WelcomeSplash name="" onDone={done} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  act(() => { vi.advanceTimersByTime(4000); });
  expect(done).toHaveBeenCalledTimes(1);
  expect(document.body.style.overflow).toBe('');
});
it('avoids rolling when reduced motion is requested', () => {
  vi.useFakeTimers();
  const original = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
  const done = vi.fn();
  render(<WelcomeSplash name="" showGreeting={false} onDone={done} />);
  expect(screen.getByRole('status')).toHaveAccessibleName('Ouverture de Finance');
  act(() => { vi.advanceTimersByTime(150); });
  expect(done).toHaveBeenCalledTimes(1);
});
