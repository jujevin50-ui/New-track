import type { Account } from '@/types/account';
import { getNetResult, type Trade } from '@/types/trade';

export interface DashboardScope {
  accountIds?: readonly string[];
  from?: string;
  to?: string;
  startingCapital?: number;
}
export interface DashboardDay {
  date: string;
  net: number;
  cumulative: number;
  trades: number;
  wins: number;
}

/** All monetary aggregates must be calculated within one currency group. */
export function buildDashboardCurrencyGroups(accounts: readonly Account[]) {
  const groups = new Map<string, { currency: string; accounts: Account[]; accountIds: string[]; startingCapital: number }>();
  for (const account of accounts) {
    const currency = account.currency?.trim().toUpperCase() || 'UNKNOWN';
    let group = groups.get(currency);
    if (!group) { group = { currency, accounts: [], accountIds: [], startingCapital: 0 }; groups.set(currency, group); }
    group.accounts.push(account);
    group.accountIds.push(account.id);
    if (Number.isFinite(account.initialBalance)) group.startingCapital += account.initialBalance;
  }
  return [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function tradeClosingDay(trade: Trade): string | null {
  return validDay(trade.endDate);
}

function validDay(value?: string): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : null;
}
function previousDay(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
function validMoney(trade: Trade) {
  return Number.isFinite(trade.result) && Number.isFinite(trade.commission ?? 0) && Number.isFinite(trade.swap ?? 0);
}

/** Selects by closing day, never by entry day, and does not mutate the source. */
export function selectClosedDashboardTrades(trades: readonly Trade[], scope: DashboardScope = {}): Trade[] {
  const ids = scope.accountIds ? new Set(scope.accountIds) : null;
  const from = validDay(scope.from);
  const to = validDay(scope.to);
  return trades.filter(trade => {
    const day = tradeClosingDay(trade);
    return (!ids || ids.has(trade.accountId)) && day !== null && validMoney(trade) && (!from || day >= from) && (!to || day <= to);
  }).sort((a, b) => {
    const dayOrder = tradeClosingDay(a)!.localeCompare(tradeClosingDay(b)!);
    return dayOrder || (a.endDate ?? '').localeCompare(b.endDate ?? '') || a.tradeNumber - b.tradeNumber || a.id.localeCompare(b.id);
  });
}

/**
 * Realized trading performance, excluding open positions and payouts.
 * Caller supplies trades/accounts from a single currency; no implicit FX conversion.
 * Open positions are account scoped and independent of the closing-period filter.
 */
export function dashboardAnalytics(trades: readonly Trade[], scope: DashboardScope = {}) {
  const closedTrades = selectClosedDashboardTrades(trades, scope);
  const ids = scope.accountIds ? new Set(scope.accountIds) : null;
  const openTrades = trades.filter(trade => (!ids || ids.has(trade.accountId)) && !trade.endDate);
  const capital = scope.startingCapital != null && Number.isFinite(scope.startingCapital) && scope.startingCapital > 0 ? scope.startingCapital : null;
  let netProfit = 0, grossResult = 0, grossGains = 0, grossLosses = 0, commissionCost = 0, swap = 0;
  let wins = 0, losses = 0, breakevens = 0, winningNet = 0, losingNet = 0, respected = 0;
  let cumulative = 0, peak = 0, maxDrawdown = 0, maxDrawdownPercent: number | null = capital === null ? null : 0;
  let currentStreak: { type: 'win' | 'loss' | null; count: number } = { type: null, count: 0 };
  const dailyMap = new Map<string, DashboardDay>();
  const monthlyMap = new Map<string, { date: string; net: number; trades: number }>();
  const results: number[] = [];
  for (const trade of closedTrades) {
    const net = getNetResult(trade);
    const day = tradeClosingDay(trade)!;
    results.push(net);
    netProfit += net;
    grossResult += trade.result;
    grossGains += Math.max(0, trade.result);
    grossLosses += Math.max(0, -trade.result);
    commissionCost += Math.abs(trade.commission || 0);
    swap += trade.swap || 0;
    if (net > 0) { wins++; winningNet += net; }
    else if (net < 0) { losses++; losingNet -= net; }
    else breakevens++;
    if (trade.strategyRespected === true) respected++;
    const type = net > 0 ? 'win' : net < 0 ? 'loss' : null;
    currentStreak = type === null ? { type: null, count: 0 } : { type, count: currentStreak.type === type ? currentStreak.count + 1 : 1 };
    cumulative += net;
    peak = Math.max(peak, cumulative);
    const drawdown = peak - cumulative;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    if (capital !== null) maxDrawdownPercent = Math.max(maxDrawdownPercent!, drawdown / (capital + peak) * 100);
    const daily = dailyMap.get(day) ?? { date: day, net: 0, cumulative: 0, trades: 0, wins: 0 };
    daily.net += net; daily.cumulative = cumulative; daily.trades++; if (net > 0) daily.wins++;
    dailyMap.set(day, daily);
    const month = day.slice(0, 7);
    const monthly = monthlyMap.get(month) ?? { date: month, net: 0, trades: 0 };
    monthly.net += net; monthly.trades++; monthlyMap.set(month, monthly);
  }
  const daily = [...dailyMap.values()];
  const byProfit = [...daily].sort((a, b) => a.net - b.net);
  const totalTrades = closedTrades.length;
  const currentDrawdown = peak - cumulative;
  const curve: DashboardDay[] = daily.length ? [{ date: previousDay(daily[0].date), net: 0, cumulative: 0, trades: 0, wins: 0 }, ...daily] : [];
  return {
    closedTrades, openTrades, totalTrades, openCount: openTrades.length,
    netProfit, grossResult, grossGains, grossLosses, commissionCost, swap,
    winningNet, losingNet, wins, losses, breakevens,
    winRate: totalTrades ? wins / totalTrades * 100 : null,
    strategyRate: totalTrades ? respected / totalTrades * 100 : null,
    avgTrade: totalTrades ? netProfit / totalTrades : null,
    expectancy: totalTrades ? netProfit / totalTrades : null,
    avgWin: wins ? winningNet / wins : null,
    avgLoss: losses ? losingNet / losses : null,
    profitFactor: losingNet > 0 ? winningNet / losingNet : winningNet > 0 ? Infinity : null,
    bestTrade: results.length ? Math.max(...results) : null,
    worstTrade: results.length ? Math.min(...results) : null,
    maxDrawdown, maxDrawdownPercent, currentDrawdown,
    currentDrawdownPercent: capital !== null ? currentDrawdown / (capital + peak) * 100 : null,
    returnPercent: capital !== null && totalTrades ? netProfit / capital * 100 : null,
    currentStreak, daily, curve, monthly: [...monthlyMap.values()],
    bestDay: byProfit.at(-1) ?? null,
    worstDay: byProfit[0] ?? null,
    winningDays: daily.filter(day => day.net > 0).length,
  };
}
export type DashboardAnalytics = ReturnType<typeof dashboardAnalytics>;
