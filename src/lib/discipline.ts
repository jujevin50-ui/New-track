import type { DailyJournal } from '@/hooks/useDailyJournal';

export const DISCIPLINE_MISSIONS = [
  { id: 'prepare', title: 'Aucune entrée sans validation complète de la checklist', detail: '' },
  { id: 'risk', title: 'Risque respecté', detail: '' },
  { id: 'wait', title: 'Deux trades par semaine max', detail: '' },
  { id: 'pause', title: 'Aucun trade destiné à récupérer une perte précédente', detail: '' },
  { id: 'review', title: 'Bilan obligatoire', detail: '' },
] as const;
export const DISCIPLINE_TRIGGERS = ['FOMO', 'Revenge trading', 'Impatience', 'Surconfiance', 'Peur de perdre', 'Fatigue'];
export const MOODS = [
  { value: 'excellent', face: '😌', label: 'Serein' },
  { value: 'good', face: '🙂', label: 'Bien' },
  { value: 'neutral', face: '😐', label: 'Neutre' },
  { value: 'bad', face: '😟', label: 'Tendu' },
  { value: 'terrible', face: '😣', label: 'Débordé' },
] as const;

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDay(date: string, offset: number): string {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() + offset);
  return localDay(day);
}
export function newDailyJournal(date: string): DailyJournal {
  return { date, strategyRespected: true, productive: false, mood: 'neutral', discipline: 3, confidence: 3, notes: '', lessonsLearned: '', mistakes: [], goals: '', event: null };
}
export function completedMissions(journal?: DailyJournal | null): string[] {
  return DISCIPLINE_MISSIONS.filter(mission => journal?.disciplineTracking?.missions.includes(mission.id)).map(mission => mission.id);
}
export function disciplineStats(journals: DailyJournal[], today: string) {
  const recorded = new Map(journals.filter(journal => journal.date <= today && completedMissions(journal).length > 0).map(journal => [journal.date, journal]));
  const xp = [...recorded.values()].reduce((sum, journal) => sum + completedMissions(journal).length * 20, 0);
  let cursor = recorded.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (recorded.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
  return { xp, streak, days: recorded.size };
}
