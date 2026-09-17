import { useCallback } from 'react';
import { useData } from '@/contexts/DataContext';

export type DailyEvent = 'perte_compte' | 'challenge_echoue' | 'challenge_realise' | null;

export interface DailyJournal {
  date: string;
  strategyRespected: boolean;
  mood: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  discipline: number;
  confidence: number;
  notes: string;
  lessonsLearned: string;
  mistakes: string[];
  goals: string;
  event?: DailyEvent;
}

export const useDailyJournal = () => {
  const { data, upsertRow, saveTable } = useData();

  const journals: DailyJournal[] = (data.dailyJournals as any[]).map(j => ({
    date: j.date,
    strategyRespected: j.strategyRespected,
    mood: j.mood,
    discipline: j.discipline,
    confidence: j.confidence,
    notes: j.notes || '',
    lessonsLearned: j.lessonsLearned || '',
    mistakes: j.mistakes || [],
    goals: j.goals || '',
    event: j.event || null,
  }));

  const getJournal = useCallback((date: string) => {
    return journals.find(j => j.date === date) || null;
  }, [journals]);

  const saveJournal = useCallback(async (journal: DailyJournal) => {
    await upsertRow('dailyJournals', journal, 'date');
  }, [upsertRow]);

  const deleteJournal = useCallback(async (date: string) => {
    await saveTable('dailyJournals', (data.dailyJournals as any[]).filter(j => j.date !== date));
  }, [saveTable, data.dailyJournals]);

  return { journals, getJournal, saveJournal, deleteJournal };
};
