import { useCallback } from 'react';
import { useData } from '@/contexts/DataContext';

export interface TradingJournalEntry {
  date: string;
  planRespected: boolean | null;
  planNotRespectedReason: string;
  madeMistake: boolean | null;
  mistakeDescription: string;
  mainLearning: string;
  newRule: string;
  importance: number; // 0-5
}

export const useTradingJournal = () => {
  const { data, upsertRow, saveTable } = useData();

  const entries: TradingJournalEntry[] = (data.tradingJournals as any[]).map(e => ({
    date: e.date,
    planRespected: e.planRespected ?? null,
    planNotRespectedReason: e.planNotRespectedReason || '',
    madeMistake: e.madeMistake ?? null,
    mistakeDescription: e.mistakeDescription || '',
    mainLearning: e.mainLearning || '',
    newRule: e.newRule || '',
    importance: typeof e.importance === 'number' ? e.importance : 0,
  }));

  const getEntry = useCallback((date: string) => {
    return entries.find(e => e.date === date) || null;
  }, [entries]);

  const saveEntry = useCallback(async (entry: TradingJournalEntry) => {
    await upsertRow('tradingJournals', entry, 'date');
  }, [upsertRow]);

  const deleteEntry = useCallback(async (date: string) => {
    await saveTable('tradingJournals', (data.tradingJournals as any[]).filter(e => e.date !== date));
  }, [saveTable, data.tradingJournals]);

  return { entries, getEntry, saveEntry, deleteEntry };
};
