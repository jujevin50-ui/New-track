import { useSyncExternalStore, useCallback } from 'react';

const PROFILE_KEY = 'user-profile-name';
const CHANGE = 'user-profile-changed';
const snapshot = () => localStorage.getItem(PROFILE_KEY) || '';
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (!event.key || event.key === PROFILE_KEY) listener(); };
  window.addEventListener(CHANGE, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(CHANGE, listener); window.removeEventListener('storage', storage); };
}
export const useUserProfile = () => {
  const userName = useSyncExternalStore(subscribe, snapshot, () => '');
  const setUserName = useCallback((name: string) => {
    localStorage.setItem(PROFILE_KEY, name);
    window.dispatchEvent(new Event(CHANGE));
  }, []);
  return { userName, setUserName };
};
