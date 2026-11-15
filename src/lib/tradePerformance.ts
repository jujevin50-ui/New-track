import type { Account } from '@/types/account';
import { getNetResult, getTradeR, type Trade } from '@/types/trade';

/** One point per already scoped, chronologically sorted closed trade. */
export function tradePerformance(trades: readonly Trade[], accounts: readonly Pick<Account, 'id' | 'initialBalance'>[]) {
  const balances = new Map(accounts.map(account => [account.id, account.initialBalance]));
  return trades.map(trade => {
    const balance = balances.get(trade.accountId);
    const validCapital = balance !== undefined && Number.isFinite(balance) && balance > 0;
    const risk = trade.riskPercent;
    const validRisk = typeof risk === 'number' && Number.isFinite(risk) && risk > 0 && risk <= 100;
    const rr = validCapital && validRisk ? getTradeR(trade, balance) : null;
    return {
      id: trade.id, tradeNumber: trade.tradeNumber, pair: trade.pair, date: trade.endDate!.slice(0, 10),
      performance: validCapital ? getNetResult(trade) / balance * 100 : null,
      rr: rr !== null && Number.isFinite(rr) ? rr : null,
    };
  });
}
export type TradePerformancePoint = ReturnType<typeof tradePerformance>[number];
