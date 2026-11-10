import type { DailyJournal } from '@/hooks/useDailyJournal';

export const DISCIPLINE_MISSIONS = [
  { id: 'prepare', title: 'Aucune entrée sans validation complète de la checklist', detail: '' },
  { id: 'risk', title: 'Risque respecté', detail: '' },
  { id: 'wait', title: 'Deux trades par semaine max', detail: '' },
  { id: 'pause', title: 'Aucun trade destiné à récupérer une perte précédente', detail: '' },
  { id: 'review', title: 'Bilan obligatoire', detail: '' },
] as const;
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDay(date: string, offset: number): string {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() + offset);
  return localDay(day);
}
export function isTradingDay(date: string): boolean {
  const weekday = new Date(`${date.slice(0,10)}T12:00:00`).getDay();
  return weekday >= 1 && weekday <= 5;
}
export function previousTradingDay(date: string): string {
  if (!Number.isFinite(new Date(`${date}T12:00:00`).getTime())) return date;
  while (!isTradingDay(date)) date = shiftDay(date, -1);
  return date;
}
export function shiftTradingDay(date: string, offset: number): string {
  let remaining = Math.abs(offset);
  while (remaining > 0) { date = shiftDay(date, offset < 0 ? -1 : 1); if (isTradingDay(date)) remaining--; }
  return date;
}
export function newDailyJournal(date: string): DailyJournal {
  return { date, strategyRespected: true, productive: false, mood: 'neutral', discipline: 3, confidence: 3, notes: '', lessonsLearned: '', mistakes: [], goals: '', event: null };
}
export function completedMissions(journal?: DailyJournal | null): string[] {
  return DISCIPLINE_MISSIONS.filter(mission => journal?.disciplineTracking?.missions.includes(mission.id)).map(mission => mission.id);
}
export function disciplineStats(journals: DailyJournal[], today: string) {
  const recorded = new Map(journals.filter(journal => journal.date <= today && isTradingDay(journal.date) && completedMissions(journal).length > 0).map(journal => [journal.date, journal]));
  const xp = [...recorded.values()].reduce((sum, journal) => sum + completedMissions(journal).length * 20, 0);
  const latestDay = previousTradingDay(today);
  let cursor = recorded.has(latestDay) ? latestDay : shiftTradingDay(latestDay, -1);
  let streak = 0;
  while (recorded.has(cursor)) { streak++; cursor = shiftTradingDay(cursor, -1); }
  return { xp, streak, days: recorded.size };
}

/** Missing tracking and future days remain gaps rather than failures. */
export function disciplineYear(journals: DailyJournal[], year: number, today: string) {
  const recorded = new Map(journals.map(journal => [journal.date, journal]));
  const days: { date: string; percent: number | null }[] = [];
  for (let date = `${year}-01-01`; date.startsWith(`${year}-`); date = shiftDay(date, 1)) {
    if (!isTradingDay(date)) continue;
    const journal = recorded.get(date);
    const percent = date <= today && journal?.disciplineTracking ? completedMissions(journal).length / DISCIPLINE_MISSIONS.length * 100 : null;
    days.push({ date, percent });
  }
  return days;
}
