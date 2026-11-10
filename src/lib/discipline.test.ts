import { describe, expect, it } from 'vitest';
import { completedMissions, disciplineStats, disciplineYear, newDailyJournal, shiftDay, isTradingDay, previousTradingDay, shiftTradingDay } from './discipline';
const journal = (date: string, missions: string[]) => ({...newDailyJournal(date),disciplineTracking:{missions,stress:3,triggers:[]}});
describe('Discipline on weekdays', () => {
  it('counts known missions once and keeps legacy journals neutral', () => {
    expect(completedMissions(journal('2026-11-09',['prepare','prepare','unknown']))).toEqual(['prepare']);
    expect(completedMissions(newDailyJournal('2026-11-09'))).toEqual([]);
  });
  it('excludes weekend XP and bridges Friday to Monday in streaks', () => {
    const entries=[journal('2026-11-06',['prepare','risk']),journal('2026-11-07',['risk']),journal('2026-11-08',['risk']),journal('2026-11-09',['review']),journal('2026-11-10',['wait'])];
    expect(disciplineStats(entries,'2026-11-09')).toEqual({xp:60,streak:2,days:2});
    expect(disciplineStats(entries,'2026-11-08')).toEqual({xp:40,streak:1,days:1});
    expect(disciplineStats([journal('2026-11-05',['risk'])],'2026-11-09').streak).toBe(0);
  });
  it('navigates weekdays across weekends and year boundaries', () => {
    expect(isTradingDay('2026-11-07')).toBe(false);
    expect(previousTradingDay('2026-11-08')).toBe('2026-11-06');
    expect(shiftTradingDay('2026-11-06',1)).toBe('2026-11-09');
    expect(shiftTradingDay('2026-11-09',-1)).toBe('2026-11-06');
    expect(shiftDay('2026-01-01',-1)).toBe('2025-12-31');
  });
  it('charts weekdays only and distinguishes zeros, missing and future entries', () => {
    const days=disciplineYear([journal('2024-02-28',[]),journal('2024-02-29',['risk','prepare']),newDailyJournal('2024-03-01'),journal('2024-03-02',['risk'])],2024,'2024-03-01');
    expect(days).toHaveLength(262);
    expect(days.find(day=>day.date==='2024-02-28')?.percent).toBe(0);
    expect(days.find(day=>day.date==='2024-02-29')?.percent).toBe(40);
    expect(days.find(day=>day.date==='2024-03-01')?.percent).toBeNull();
    expect(days.some(day=>day.date==='2024-03-02')).toBe(false);
    expect(days.find(day=>day.date==='2024-03-04')?.percent).toBeNull();
    expect(disciplineYear([],2026,'2026-11-09')).toHaveLength(261);
  });
});
