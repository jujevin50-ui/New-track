import { describe, expect, it } from 'vitest';
import type { Trade } from '@/types/trade';
import type { Account } from '@/types/account';
import { buildDashboardCurrencyGroups, dashboardAnalytics, selectClosedDashboardTrades } from './dashboardAnalytics';

const trade = (id: string, endDate: string | undefined, result: number, overrides: Partial<Trade> = {}): Trade => ({
  id, tradeNumber: Number(id) || 1, accountId: 'usd', date: '2026-01-01', endDate,
  pair: 'EURUSD', type: 'Buy', result, commission: 0, swap: 0, exitType: 'Manual', setupQuality: 2, strategyRespected: true,
  ...overrides,
});
const account = (id: string, currency: string, initialBalance: number): Account => ({ id, currency, initialBalance, name: id, accountCode: '', broker: '', createdAt: '2026-01-01', status: 'active', category: 'Demo', payoutIntervalDays: 0, dailyDrawdownPct: 0, maxDrawdownPct: 0, riskPct: 1 });

describe('Dashboard realized analytics', () => {
  it('excludes open and invalid positions, uses closing chronology and preserves the input order', () => {
    const input = [trade('3', '2026-02-03', -20), trade('1', '2026-02-01', 100), trade('open', undefined, 900), trade('bad-date', '2026-02-30', 500), trade('bad-value', '2026-02-02', NaN), trade('2', '2026-02-02', -30)];
    const result = dashboardAnalytics(input, { startingCapital: 1000 });
    expect(result.closedTrades.map(item => item.id)).toEqual(['1', '2', '3']);
    expect(input.map(item => item.id)).toEqual(['3', '1', 'open', 'bad-date', 'bad-value', '2']);
    expect(result.netProfit).toBe(50);
    expect(result.openTrades.map(item => item.id)).toEqual(['open']);
    expect(result.curve.map(point => point.cumulative)).toEqual([0, 100, 70, 50]);
    expect(result.curve[0].date).toBe('2026-01-31');
    expect(result.currentStreak).toEqual({ type: 'loss', count: 2 });
  });

  it('accounts for absolute commissions, signed swaps and breakevens without inflating expectancy', () => {
    const result = dashboardAnalytics([
      trade('1', '2026-02-01', 100, { commission: -10, swap: 2 }),
      trade('2', '2026-02-01', -20, { commission: 5, swap: -3, strategyRespected: false }),
      trade('3', '2026-02-02', 0),
    ], { startingCapital: 1000 });
    expect(result.grossResult).toBe(80);
    expect(result.commissionCost).toBe(15);
    expect(result.swap).toBe(-1);
    expect(result.netProfit).toBe(64);
    expect([result.wins, result.losses, result.breakevens]).toEqual([1, 1, 1]);
    expect(result.winRate).toBeCloseTo(100 / 3);
    expect(result.expectancy).toBeCloseTo(64 / 3);
    expect(result.profitFactor).toBeCloseTo(92 / 28);
    expect(result.strategyRate).toBeCloseTo(200 / 3);
    expect(result.currentStreak).toEqual({ type: null, count: 0 });
    expect(result.daily).toEqual([
      { date: '2026-02-01', net: 64, cumulative: 64, trades: 2, wins: 1 },
      { date: '2026-02-02', net: 0, cumulative: 64, trades: 1, wins: 0 },
    ]);
    expect(result.monthly).toEqual([{ date: '2026-02', net: 64, trades: 3 }]);
  });

  it('calculates drawdown from the realized peak, including losses recovered within one day', () => {
    const result = dashboardAnalytics([trade('1', '2026-02-01', 100), trade('2', '2026-02-02', -50), trade('3', '2026-02-02', 60), trade('4', '2026-02-03', -20)], { startingCapital: 1000 });
    expect(result.maxDrawdown).toBe(50);
    expect(result.maxDrawdownPercent).toBeCloseTo(50 / 1100 * 100);
    expect(result.currentDrawdown).toBe(20);
    expect(result.currentDrawdownPercent).toBeCloseTo(20 / 1110 * 100);
    expect(result.returnPercent).toBe(9);
    expect(result.bestDay?.date).toBe('2026-02-01');
    expect(result.worstDay?.date).toBe('2026-02-03');
  });

  it('filters inclusively by close date and account while open positions remain a current scope snapshot', () => {
    const input = [trade('1', '2026-01-31', 10), trade('2', '2026-02-01', 20, { date: '2025-12-01' }), trade('3', '2026-02-28T12:00:00', 30), trade('4', '2026-03-01', 40), trade('5', '2026-02-15', 100, { accountId: 'eur' }), trade('6', undefined, 100, { date: '2025-01-01' })];
    const scope = { accountIds: ['usd'], from: '2026-02-01', to: '2026-02-28' };
    expect(selectClosedDashboardTrades(input, scope).map(item => item.id)).toEqual(['2', '3']);
    const result = dashboardAnalytics(input, scope);
    expect(result.netProfit).toBe(50);
    expect(result.openCount).toBe(1);
  });

  it('uses null for unavailable ratios and preserves monetary drawdown with zero capital', () => {
    const empty = dashboardAnalytics([], { startingCapital: 0 });
    expect(empty.winRate).toBeNull(); expect(empty.profitFactor).toBeNull(); expect(empty.strategyRate).toBeNull();
    expect(empty.avgTrade).toBeNull(); expect(empty.curve).toEqual([]);
    const losses = dashboardAnalytics([trade('1', '2026-01-01', -30)], { startingCapital: 0 });
    expect(losses.maxDrawdown).toBe(30); expect(losses.maxDrawdownPercent).toBeNull(); expect(losses.currentDrawdownPercent).toBeNull(); expect(losses.returnPercent).toBeNull();
    expect(losses.profitFactor).toBe(0);
    expect(dashboardAnalytics([trade('1', '2026-01-01', 100)]).profitFactor).toBe(Infinity);
    expect(dashboardAnalytics([trade('1', '2026-01-01', 0)]).profitFactor).toBeNull();
  });
});

describe('Dashboard currency scopes', () => {
  it('keeps currencies separate and normalizes currency labels without currency conversion', () => {
    const result = buildDashboardCurrencyGroups([account('usd', 'USD', 1000), account('eur', ' eur ', 2000), account('usd-2', 'usd', 3000)]);
    expect(result.map(group => [group.currency, group.accountIds, group.startingCapital])).toEqual([['EUR', ['eur'], 2000], ['USD', ['usd', 'usd-2'], 4000]]);
  });
});
