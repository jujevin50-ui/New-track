import { useSyncExternalStore } from 'react';

const KEY = 'finance-selected-account';
const EVENT = 'finance-account-change';
let fallback = 'all';
const read = () => { try { return localStorage.getItem(KEY) || 'all'; } catch { return fallback; } };
const subscribe = (listener: () => void) => {
  const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', storage); };
};
export function useFinanceAccount(accounts: { id: string }[]) {
  const stored = useSyncExternalStore(subscribe, read, () => 'all');
  const selected = stored === 'all' || accounts.some(account => account.id === stored) ? stored : 'all';
  const select = (id: string) => {
    fallback = id;
    try { localStorage.setItem(KEY, id); } catch { /* Keep selection usable without storage. */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return [selected, select] as const;
}
