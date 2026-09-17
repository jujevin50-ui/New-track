import { useState, useCallback } from 'react';

const PROFILE_KEY = 'user-profile-name';

export const useUserProfile = () => {
  const [userName, setUserNameState] = useState<string>(() => {
    return localStorage.getItem(PROFILE_KEY) || '';
  });

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    localStorage.setItem(PROFILE_KEY, name);
  }, []);

  return { userName, setUserName };
};
