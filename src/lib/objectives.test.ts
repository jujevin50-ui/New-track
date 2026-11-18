import { describe, expect, it } from 'vitest';
import { measureObjective, type Objective } from './objectives';
import { newDailyJournal } from './discipline';
import { normalizeData } from './fileStorage';

const objective: Objective = {
  id: 'goal', title: 'Tenir mon journal', note: '', metric: 'reviews',
  start: '2026-11-02', end: '2026-11-08', target: 2, manualProgress: 0,
};

describe('objectives', () => {
  it('deduplicates journal dates and excludes dates outside the period or after today', () => {
    const journal = newDailyJournal('2026-11-02');
    const journals = [journal, journal, newDailyJournal('2026-11-01'), newDailyJournal('2026-11-07')];
    expect(measureObjective(objective, '2026-11-03', journals, [])).toEqual({ value: 1, percent: 50, status: 'active' });
    expect(measureObjective(objective, '2026-11-09', journals, [])).toEqual({ value: 2, percent: 100, status: 'achieved' });
  });

  it('counts only known missions and closed trades respecting the plan', () => {
    const journal = { ...newDailyJournal('2026-11-08'), disciplineTracking: { missions: ['prepare', 'prepare', 'risk', 'unknown'], stress: 3, triggers: [] } };
    expect(measureObjective({ ...objective, metric: 'missions' }, '2026-11-08', [journal], []).value).toBe(2);
    const trades = [
      { endDate: '2026-11-08T14:00:00Z', strategyRespected: true },
      { endDate: '2026-11-07', strategyRespected: false },
      { strategyRespected: true },
      { endDate: '2026-11-09', strategyRespected: true },
    ];
    expect(measureObjective({ ...objective, metric: 'plan' }, '2026-11-10', [], trades)).toEqual({ value: 1, percent: 50, status: 'expired' });
  });

  it('keeps old data files compatible and records manual progress', () => {
    expect(normalizeData({ version: 1 }).objectives).toEqual([]);
    expect(measureObjective({ ...objective, metric: 'manual', manualProgress: 3 }, '2026-11-09', [], [])).toEqual({ value: 3, percent: 100, status: 'achieved' });
    expect(measureObjective(objective, '2026-11-01', [], []).status).toBe('upcoming');
  });
});
