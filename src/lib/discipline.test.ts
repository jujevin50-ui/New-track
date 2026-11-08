import { describe, expect, it } from 'vitest';
import { completedMissions, disciplineStats, newDailyJournal, shiftDay } from './discipline';

const journal = (date: string, missions: string[]) => ({ ...newDailyJournal(date), disciplineTracking: { missions, stress: 3, triggers: [] } });
describe('Discipline progress', () => {
  it('counts each known mission once and keeps legacy journals neutral', () => {
    expect(completedMissions(journal('2026-11-08', ['prepare', 'prepare', 'unknown']))).toEqual(['prepare']);
    expect(completedMissions(newDailyJournal('2026-11-08'))).toEqual([]);
  });
  it('calculates saved XP and a consecutive streak without future or empty entries', () => {
    expect(disciplineStats([journal('2026-11-08', ['prepare', 'risk']), journal('2026-11-07', ['wait']), journal('2026-11-06', []), journal('2026-11-09', ['review'])], '2026-11-08')).toEqual({ xp: 60, streak: 2, days: 2 });
    expect(disciplineStats([journal('2026-11-07', ['wait'])], '2026-11-08').streak).toBe(1);
    expect(disciplineStats([journal('2026-11-06', ['wait'])], '2026-11-08').streak).toBe(0);
  });
  it('moves between local calendar days across month and year boundaries', () => {
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
});
