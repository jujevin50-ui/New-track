import type { DailyJournal } from '@/hooks/useDailyJournal';
import type { Trade } from '@/types/trade';
import { completedMissions } from './discipline';

type ObjectiveMetric = 'reviews' | 'missions' | 'plan' | 'manual';
export type ObjectiveStatus = 'active' | 'upcoming' | 'achieved' | 'expired';

export interface Objective {
  id: string;
  title: string;
  note: string;
  completed?: boolean;
  metric: ObjectiveMetric;
  start: string;
  end: string;
  target: number;
  manualProgress: number;
}

export function measureObjective(
  objective: Objective,
  today: string,
  journals: DailyJournal[],
  trades: Pick<Trade, 'endDate' | 'strategyRespected'>[],
): { value: number; percent: number; status: ObjectiveStatus } {
  const { start, end, metric, target } = objective;
  const inPeriod = (date: string) => date >= start && date <= end && date <= today;
  let value: number;
  if (metric === 'manual') {
    value = objective.manualProgress;
  } else if (metric === 'plan') {
    value = trades.filter(trade => trade.strategyRespected && trade.endDate && inPeriod(trade.endDate.slice(0, 10))).length;
  } else {
    const days = new Map(journals.filter(journal => inPeriod(journal.date)).map(journal => [journal.date, journal]));
    value = metric === 'reviews' ? days.size : [...days.values()].reduce((total, journal) => total + completedMissions(journal).length, 0);
  }
  const reached = value >= target;
  return {
    value,
    percent: reached ? 100 : Math.floor(value / target * 100),
    status: reached ? 'achieved' : today < start ? 'upcoming' : today > end ? 'expired' : 'active',
  };
}
