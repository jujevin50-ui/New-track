import { useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export interface WeeklyReportData {
  weekKey: string;
  emotionGenerale: string;
  tradesEmotionnels: number;
  tradeNotes: Record<string, string>;
  conclusion: string;
  objectifPrincipal: string;
  objectifsSecondaires: string;
  pointsPsychologiques: string;
  solutions: string;
}

export const getWeekKey = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const getWeekRange = (weekKey: string): { start: Date; end: Date } => {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
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

const emptyReport = (weekKey: string): WeeklyReportData => ({
  weekKey,
  emotionGenerale: '',
  tradesEmotionnels: 0,
  tradeNotes: {},
  conclusion: '',
  objectifPrincipal: '',
  objectifsSecondaires: '',
  pointsPsychologiques: '',
  solutions: '',
});

export const useWeeklyReport = () => {
  const { data, upsertRow } = useData();

  const reports = useMemo(() => {
    const map: Record<string, WeeklyReportData> = {};
    (data.weeklyReports as any[] || []).forEach((r: any) => {
      map[r.weekKey] = {
        weekKey: r.weekKey,
        emotionGenerale: r.emotionGenerale || '',
        tradesEmotionnels: Number(r.tradesEmotionnels) || 0,
        tradeNotes: r.tradeNotes || {},
        conclusion: r.conclusion || '',
        objectifPrincipal: r.objectifPrincipal || '',
        objectifsSecondaires: r.objectifsSecondaires || '',
        pointsPsychologiques: r.pointsPsychologiques || '',
        solutions: r.solutions || '',
      };
    });
    return map;
  }, [data.weeklyReports]);

  const getReport = useCallback((weekKey: string): WeeklyReportData => {
    return reports[weekKey] || emptyReport(weekKey);
  }, [reports]);

  const saveReport = useCallback(async (reportData: WeeklyReportData) => {
    await upsertRow('weeklyReports', reportData, 'weekKey');
  }, [upsertRow]);

  return { reports, getReport, saveReport };
};
