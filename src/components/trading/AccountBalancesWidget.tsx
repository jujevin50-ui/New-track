import { useMemo } from 'react';
import { Trade, getNetResult } from '@/types/trade';
import { Account } from '@/types/account';

interface Props {
  trades: Trade[];
  accounts: Account[];
  accentColor?: string;
}

const AccountBalancesWidget = ({ trades, accounts, accentColor }: Props) => {
  const data = useMemo(() => {
    // Find accounts with most recent trades
    const lastTradeByAccount = new Map<string, string>();
    [...trades]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(t => {
        if (!lastTradeByAccount.has(t.accountId)) lastTradeByAccount.set(t.accountId, t.date);
      });

    return accounts
      .filter(a => lastTradeByAccount.has(a.id))
      .map(a => {
        const accTrades = trades.filter(t => t.accountId === a.id);
        const profit = accTrades.reduce((s, t) => s + getNetResult(t), 0);
        const balance = a.initialBalance + profit;
        const pct = a.initialBalance > 0 ? (profit / a.initialBalance) * 100 : 0;
        return { id: a.id, name: a.name, currency: a.currency, balance, profit, pct, lastDate: lastTradeByAccount.get(a.id)! };
      })
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
      .slice(0, 6);
  }, [trades, accounts]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        No recent trades
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pr-1 space-y-1.5">
      {data.map(d => {
        const isProfit = d.profit >= 0;
        const c = accentColor || (isProfit ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)');
        return (
          <div
            key={d.id}
            className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border"
            style={{ borderColor: `${c}40`, backgroundColor: `${c}12` }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold truncate">{d.name}</span>
              <span className="text-[10px] text-muted-foreground">Last trade · {d.lastDate}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[12px] font-bold tabular-nums" style={{ color: c }}>
                {d.currency} {d.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] tabular-nums" style={{ color: c }}>
                {isProfit ? '+' : ''}{d.pct.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AccountBalancesWidget;
