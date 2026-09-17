import { useMemo } from 'react';
import { useDailyJournal } from './useDailyJournal';

export const useStrategyStreak = () => {
  const { journals } = useDailyJournal();

  return useMemo(() => {
    const sorted = [...journals].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const j of sorted) {
      const dow = new Date(j.date + 'T12:00:00').getDay();
      if (dow === 0 || dow === 6) continue; // weekends don't count and don't break the streak

      if (!j.strategyRespected) break;
      streak++;
    }
    return streak;
  }, [journals]);
};
