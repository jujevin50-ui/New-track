import { describe, expect, it } from 'vitest';
import { tradePerformance } from './tradePerformance';
import type { Trade } from '@/types/trade';
const trade = (id: string, result: number, extra: Partial<Trade> = {}): Trade => ({id, accountId:'a', tradeNumber:1, date:'2026-01-01', endDate:'2026-01-02', pair:'EURUSD', type:'Buy', result, commission:10, swap:-5, riskPercent:1, exitType:'Manual', setupQuality:2, strategyRespected:true, ...extra});
describe('realized performance per trade', () => {
  it('keeps every trade, even on the same day, using net costs and its own account capital', () => {
    const points = tradePerformance([trade('1',215),trade('2',-85,{accountId:'b'})], [{id:'a',initialBalance:10000},{id:'b',initialBalance:20000}]);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({id:'1',performance:2,rr:2});
    expect(points[1]).toMatchObject({id:'2',performance:-0.5,rr:-0.5});
  });
  it('preserves zero and leaves missing or invalid inputs unavailable', () => {
    const points = tradePerformance([trade('1',15),trade('2',115,{riskPercent:undefined}),trade('3',115,{riskPercent:101}),trade('4',115,{accountId:'missing'})], [{id:'a',initialBalance:10000}]);
    expect(points[0]).toMatchObject({performance:0,rr:0});
    expect(points[1]).toMatchObject({performance:1,rr:null});
    expect(points[2].rr).toBeNull();
    expect(points[3]).toMatchObject({performance:null,rr:null});
  });
});
