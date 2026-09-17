import { useState, useCallback } from 'react';

const GEMINI_KEY_STORAGE = 'ai-assistant-gemini-key';

export const useAiSettings = () => {
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem(GEMINI_KEY_STORAGE) || '');

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    if (trimmed) localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  }, []);

  return { apiKey, setApiKey };
};
