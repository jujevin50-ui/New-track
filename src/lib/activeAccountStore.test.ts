import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTIVE_ACCOUNT_KEY, readActiveAccount, selectActiveAccount, subscribeActiveAccount } from './activeAccountStore';

afterEach(() => localStorage.clear());
describe('Shared persistent account selection', () => {
  it('defaults to all accounts and saves explicit selections immediately', () => {
    expect(readActiveAccount()).toBe('all');
    selectActiveAccount('account-a');
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe('account-a');
    expect(readActiveAccount()).toBe('account-a');
    selectActiveAccount('all');
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe('all');
  });
  it('notifies every consumer and unsubscribes cleanly without rewriting stale selections', () => {
    const first = vi.fn(), second = vi.fn();
    const stopFirst = subscribeActiveAccount(first), stopSecond = subscribeActiveAccount(second);
    selectActiveAccount('account-b');
    expect(first).toHaveBeenCalledTimes(1); expect(second).toHaveBeenCalledTimes(1);
    stopFirst(); selectActiveAccount('all');
    expect(first).toHaveBeenCalledTimes(1); expect(second).toHaveBeenCalledTimes(2);
    stopSecond();
  });
  it('restores a saved value and handles changes from another browser tab', () => {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, 'saved-account');
    expect(readActiveAccount()).toBe('saved-account');
    const listener = vi.fn(), stop = subscribeActiveAccount(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(listener).not.toHaveBeenCalled();
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, 'another-account');
    window.dispatchEvent(new StorageEvent('storage', {key: ACTIVE_ACCOUNT_KEY}));
    expect(listener).toHaveBeenCalledOnce(); expect(readActiveAccount()).toBe('another-account');
    stop();
  });
});
