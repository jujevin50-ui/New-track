import { describe, expect, it } from 'vitest';
import { periodPerformance } from './periodPerformance';
import { dashboardAnalytics } from './dashboardAnalytics';
import type { Trade } from '@/types/trade';
const trade=(id:string,endDate:string,result:number,commission=0):Trade=>({id,tradeNumber:1,accountId:'a',date:'2025-12-01',endDate,pair:'EURUSD',type:'Buy',result,commission,swap:0,exitType:'Manual',setupQuality:2,strategyRespected:true});
describe('performance history periods',()=>{
  it('groups an ISO week across the year boundary and uses net costs',()=>{
    const result=periodPerformance([trade('a','2025-12-31',100,10),trade('b','2026-01-02',-50,-5)],1000,'week');
    expect(result).toHaveLength(1);expect(result[0]).toMatchObject({start:'2025-12-29',end:'2026-01-04',week:1,year:2026,net:35,trades:2,wins:1,winRate:50});expect(result[0].performance).toBeCloseTo(3.5);
  });
  it('keeps the selected period and account scope rather than adding the rest of a week',()=>{
    const selected=dashboardAnalytics([trade('a','2026-01-01',100),trade('b','2026-01-02',200),{...trade('c','2026-01-02',9999),accountId:'other'}],{accountIds:['a'],from:'2026-01-02',to:'2026-01-02'}).closedTrades;
    expect(periodPerformance(selected,20000,'week')[0]).toMatchObject({net:200,trades:1,performance:1});
  });
  it('keeps different years/months distinct and orders newest first',()=>{
    const result=periodPerformance([trade('a','2025-01-06',20),trade('b','2026-01-06',40)],1000,'month');
    expect(result.map(row=>row.start)).toEqual(['2026-01-01','2025-01-01']);expect(result[0].end).toBe('2026-01-31');
  });
  it('does not fabricate percentages without a positive capital or count open trades',()=>{
    const result=periodPerformance([trade('a','2026-01-02',0),trade('b','',100)],0,'month');
    expect(result).toHaveLength(1);expect(result[0]).toMatchObject({trades:1,winRate:0,performance:null});
  });
});

describe('cumulative realized R',()=>{
  it('uses each trade account capital, not the global capital',()=>{
    const rows=periodPerformance([{...trade('a','2026-01-02',210,10),riskPercent:1},{...trade('b','2026-01-02',-40,10),accountId:'b',riskPercent:2}],30000,'month',[{id:'a',initialBalance:10000},{id:'b',initialBalance:20000}]);
    expect(rows[0].rr).toBeCloseTo(1.875);expect(rows[0].rrTrades).toBe(2);
  });
  it('does not display a partial total when a trade risk is missing',()=>{
    const rows=periodPerformance([{...trade('a','2026-01-02',100),riskPercent:1},trade('b','2026-01-02',50)],10000,'week',[{id:'a',initialBalance:10000}]);
    expect(rows[0].rr).toBeNull();expect(rows[0].rrTrades).toBe(1);
  });
  it('keeps a valid zero R total and excludes missing/zero account capital',()=>{
    const trades=[{...trade('a','2026-01-02',0),riskPercent:1}];
    expect(periodPerformance(trades,10000,'week',[{id:'a',initialBalance:10000}])[0].rr).toBe(0);
    expect(periodPerformance(trades,10000,'week',[{id:'a',initialBalance:0}])[0].rr).toBeNull();
  });
});
