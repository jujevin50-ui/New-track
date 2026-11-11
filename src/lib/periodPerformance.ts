import { tradeClosingDay } from './dashboardAnalytics';
import { getNetResult, type Trade } from '@/types/trade';

export interface PeriodPerformance {
  start: string; end: string; year: number; week?: number;
  net: number; trades: number; wins: number; performance: number | null; winRate: number;
}
const dayKey = (date: Date) => date.toISOString().slice(0,10);

/** Aggregate an already account/currency/period-scoped selection by closing date. */
export function periodPerformance(trades: readonly Trade[], capital: number, kind: 'week'|'month'): PeriodPerformance[] {
  const periods=new Map<string,PeriodPerformance>();
  for (const trade of trades) {
    const closing=tradeClosingDay(trade),net=getNetResult(trade);
    if (!closing || !Number.isFinite(net)) continue;
    const date=new Date(`${closing}T12:00:00Z`);
    let start:string,end:string,year=date.getUTCFullYear(),week:number|undefined;
    if (kind==='week') {
      date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
      start=dayKey(date);
      const sunday=new Date(date);sunday.setUTCDate(sunday.getUTCDate()+6);end=dayKey(sunday);
      const thursday=new Date(date);thursday.setUTCDate(thursday.getUTCDate()+3);year=thursday.getUTCFullYear();
      week=Math.ceil(((thursday.getTime()-Date.UTC(year,0,1,12))/86400000+1)/7);
    } else {
      start=closing.slice(0,7)+'-01';end=dayKey(new Date(Date.UTC(year,date.getUTCMonth()+1,0,12)));
    }
    const row=periods.get(start)??{start,end,year,week,net:0,trades:0,wins:0,performance:null,winRate:0};
    row.net+=net;row.trades++;if(net>0)row.wins++;
    row.performance=Number.isFinite(capital)&&capital>0?row.net/capital*100:null;
    row.winRate=row.wins/row.trades*100;
    periods.set(start,row);
  }
  return [...periods.values()].sort((a,b)=>b.start.localeCompare(a.start));
}
