import type { SetStateAction } from 'react';

export const ACTIVE_ACCOUNT_KEY = 'trading-journal-active-account';
const CHANGE_EVENT = 'trading-journal-account-change';
let fallback = 'all';

export function readActiveAccount(): string {
  try { return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || 'all'; }
  catch { return fallback; }
}

export function subscribeActiveAccount(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_ACCOUNT_KEY || event.key === null) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function selectActiveAccount(value: SetStateAction<string | null>) {
  const current = readActiveAccount();
  const next = (typeof value === 'function' ? value(current) : value) || 'all';
  if (next === current) return;
  fallback = next;
  try { localStorage.setItem(ACTIVE_ACCOUNT_KEY, next); } catch { /* Keep navigation usable when storage is unavailable. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
