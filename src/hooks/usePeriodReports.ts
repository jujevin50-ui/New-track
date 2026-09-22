import { useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export type PeriodType = 'weekly' | 'monthly' | 'yearly';

export interface PeriodReportData {
  emotionGenerale: string;
  tradesEmotionnels: number;
  tradeNotes: Record<string, string>;
  conclusion: string;
  objectifPrincipal: string;
  objectifsSecondaires: string;
  pointsPsychologiques: string;
  solutions: string;
}

const EMPTY_REPORT = (periodKey: string): PeriodReportData & { periodKey: string } => ({
  periodKey,
  emotionGenerale: '',
  tradesEmotionnels: 0,
  tradeNotes: {},
  conclusion: '',
  objectifPrincipal: '',
  objectifsSecondaires: '',
  pointsPsychologiques: '',
  solutions: '',
});

export const getPeriodKey = (type: PeriodType, date: Date): string => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  if (type === 'yearly') return String(y);
  if (type === 'monthly') return `${y}-${String(m).padStart(2, '0')}`;

  const d = new Date(Date.UTC(y, date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const getPeriodRange = (type: PeriodType, periodKey: string): { start: Date; end: Date } => {
  if (type === 'yearly') {
    const year = Number(periodKey);
    return {
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year, 11, 31)),
    };
  }

  if (type === 'monthly') {
    const [year, month] = periodKey.split('-').map(Number);
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 0)),
    };
  }

  const [yearStr, weekStr] = periodKey.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = jan1.getUTCDay() || 7;
  const firstMonday = new Date(jan1);
  firstMonday.setUTCDate(jan1.getUTCDate() + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek));
  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
};

export const getPeriodLabel = (type: PeriodType, periodKey: string): string => {
  if (type === 'yearly') return periodKey;
  if (type === 'monthly') {
    const [year, month] = periodKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const range = getPeriodRange(type, periodKey);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  return `${range.start.toLocaleDateString('en-US', opts)} – ${range.end.toLocaleDateString('en-US', opts)}`;
};

const tableFor = (type: PeriodType) =>
  type === 'weekly' ? 'weeklyReports' : type === 'monthly' ? 'monthlyReports' : 'yearlyReports';

const keyFor = (type: PeriodType) =>
  type === 'weekly' ? 'weekKey' : type === 'monthly' ? 'monthKey' : 'yearKey';

export const usePeriodReports = () => {
  const { data, upsertRow } = useData();

  const mapFor = useCallback((type: PeriodType) => {
    const rows = (data[tableFor(type) as keyof typeof data] as any[] || []);
    const keyField = keyFor(type);
    const map: Record<string, PeriodReportData & { periodKey: string }> = {};

    for (const row of rows) {
      const periodKey = row[keyField];
      if (!periodKey) continue;
      map[periodKey] = {
        periodKey,
        emotionGenerale: row.emotionGenerale || '',
        tradesEmotionnels: Number(row.tradesEmotionnels) || 0,
        tradeNotes: row.tradeNotes || {},
        conclusion: row.conclusion || '',
        objectifPrincipal: row.objectifPrincipal || '',
        objectifsSecondaires: row.objectifsSecondaires || '',
        pointsPsychologiques: row.pointsPsychologiques || '',
        solutions: row.solutions || '',
      };
    }
    return map;
  }, [data]);

  const reports = useMemo(() => ({
    weekly: mapFor('weekly'),
    monthly: mapFor('monthly'),
    yearly: mapFor('yearly'),
  }), [mapFor]);

  const getReport = useCallback((type: PeriodType, periodKey: string) => {
    return reports[type][periodKey] || EMPTY_REPORT(periodKey);
  }, [reports]);

  const saveReport = useCallback(async (
    type: PeriodType,
    periodKey: string,
    report: PeriodReportData,
  ) => {
    await upsertRow(
      tableFor(type) as any,
      { [keyFor(type)]: periodKey, ...report },
      keyFor(type),
    );
  }, [upsertRow]);

  return { reports, getReport, saveReport };
};
