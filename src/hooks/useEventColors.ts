import { useState, useCallback } from 'react';

export interface EventColors {
  challenge_realise: string;
  challenge_echoue: string;
  perte_compte: string;
}

export const DEFAULT_EVENT_COLORS: EventColors = {
  challenge_realise: 'hsl(142, 71%, 45%)',
  challenge_echoue:  'hsl(38, 92%, 50%)',
  perte_compte:      'hsl(0, 84%, 60%)',
};

const KEY = 'event-colors';

export const useEventColors = () => {
  const [colors, setColors] = useState<EventColors>(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) return { ...DEFAULT_EVENT_COLORS, ...JSON.parse(s) };
    } catch {}
    return DEFAULT_EVENT_COLORS;
  });

  const setEventColor = useCallback((event: keyof EventColors, color: string) => {
    setColors(prev => {
      const next = { ...prev, [event]: color };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { colors, setEventColor };
};
