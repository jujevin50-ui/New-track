import { useCallback, useMemo } from 'react';
import { Trade, TradeFormData, getNetResult } from '@/types/trade';
import { Account } from '@/types/account';
import { useData } from '@/contexts/DataContext';

export const useTrades = (accountId: string | null, initialBalance: number) => {
  const { data, addRow, updateRow, deleteRow } = useData();

  const accountPayouts = useMemo(() => {
    if (!accountId) return [];
    return (data.payouts as any[] || [])
      .filter((p: any) => p.accountId === accountId)
      .map((p: any) => ({ id: p.id, amount: Number(p.amount), date: p.date }));
  }, [data.payouts, accountId]);

  const totalPayouts = useMemo(
    () => accountPayouts.reduce((s, p) => s + p.amount, 0),
    [accountPayouts]
  );

  const validAccountIds = useMemo(
    () => new Set((data.accounts as any[]).map((a: any) => a.id)),
    [data.accounts]
  );

  const allTrades: Trade[] = useMemo(() => (data.trades as any[])
    .filter((t: any) => validAccountIds.has(t.accountId))
    .map(t => ({
    id: t.id,
    tradeNumber: t.tradeNumber,
    date: t.date,
    endDate: t.endDate,
    pair: t.pair,
    type: t.type as 'Buy' | 'Sell',
    result: Number(t.result),
    commission: Number(t.commission),
    swap: Number(t.swap),
    exitType: t.exitType,
    setupQuality: t.setupQuality,
    strategyRespected: t.strategyRespected,
    riskPercent: t.riskPercent !== undefined && t.riskPercent !== null ? Number(t.riskPercent) : undefined,
    screenshots: t.screenshots || [],
    notes: t.notes || '',
    accountId: t.accountId,
  })), [data.trades, validAccountIds]);

  const trades = useMemo(() => {
    if (!accountId) return [];
    if (accountId === 'all') return [...allTrades].sort((a, b) => a.date.localeCompare(b.date));
    return allTrades.filter(t => t.accountId === accountId).sort((a, b) => a.date.localeCompare(b.date));
  }, [allTrades, accountId]);

  const addTrade = useCallback(async (formData: TradeFormData) => {
    const max = allTrades.reduce((m, t) => Math.max(m, t.tradeNumber || 0), 0);
    const tradeNumber = max + 1;
    const screenshots = formData.screenshots?.length ? formData.screenshots : formData.screenshot ? [formData.screenshot] : [];
    const trade: Trade = { ...formData, id: crypto.randomUUID(), tradeNumber, screenshots };
    await addRow('trades', trade);
  }, [addRow, allTrades]);

  /* Bulk add with sequential trade numbers (calling addTrade in a loop would reuse the same number) */
  const addTrades = useCallback(async (formDataList: TradeFormData[]) => {
    let max = allTrades.reduce((m, t) => Math.max(m, t.tradeNumber || 0), 0);
    for (const formData of formDataList) {
      const screenshots = formData.screenshots?.length ? formData.screenshots : formData.screenshot ? [formData.screenshot] : [];
      const trade: Trade = { ...formData, id: crypto.randomUUID(), tradeNumber: ++max, screenshots };
      await addRow('trades', trade);
    }
  }, [addRow, allTrades]);

  const updateTrade = useCallback(async (id: string, formData: TradeFormData) => {
    const screenshots = formData.screenshots?.length ? formData.screenshots : formData.screenshot ? [formData.screenshot] : [];
    const existing = allTrades.find(t => t.id === id);
    await updateRow('trades', id, { ...formData, id, screenshots, tradeNumber: existing?.tradeNumber });
  }, [updateRow, allTrades]);

  const deleteTrade = useCallback(async (id: string) => {
    await deleteRow('trades', id);
  }, [deleteRow]);

  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + getNetResult(t), 0);
    const currentBalance = initialBalance + totalProfit - totalPayouts;
    const wins = trades.filter(t => getNetResult(t) > 0);
    const losses = trades.filter(t => getNetResult(t) < 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + getNetResult(t), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + getNetResult(t), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;
    const profitPercent = initialBalance > 0 ? (totalProfit / initialBalance) * 100 : 0;
    const avgTrade = trades.length > 0 ? totalProfit / trades.length : 0;
    const nets = trades.map(t => getNetResult(t));
    const bestTrade = nets.length > 0 ? Math.max(...nets) : 0;
    const worstTrade = nets.length > 0 ? Math.min(...nets) : 0;
    const expectancy = trades.length > 0 ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;
    let peak = initialBalance, maxDrawdown = 0, bal = initialBalance;
    trades.forEach(t => { bal += getNetResult(t); if (bal > peak) peak = bal; const dd = ((peak - bal) / peak) * 100; if (dd > maxDrawdown) maxDrawdown = dd; });
    return { currentBalance, totalProfit, profitPercent, maxDrawdown, winRate, totalTrades: trades.length, profitFactor, avgRR, avgTrade, wins: wins.length, losses: losses.length, bestTrade, worstTrade, expectancy };
  }, [trades, initialBalance]);

  const chartData = useMemo(() => {
    // Trades-only equity curve (for drawdown — not affected by payouts)
    const tradesOnlyEquity = trades.reduce<{ date: string; balance: number }[]>((acc, trade, i) => {
      const prev = i === 0 ? initialBalance : acc[i - 1].balance;
      acc.push({ date: trade.date, balance: prev + getNetResult(trade) });
      return acc;
    }, []);

    // Equity curve with payouts for display (actual balance)
    const events: { date: string; delta: number; isLive: boolean }[] = [
      ...trades.map(t => ({ date: t.endDate || t.date, delta: getNetResult(t), isLive: !t.endDate })),
      ...accountPayouts.map(p => ({ date: p.date, delta: -p.amount, isLive: false })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let bal = initialBalance;
    const equityCurve = events.map(e => { bal += e.delta; return { date: e.date, balance: bal, isLive: e.isLive }; });

    const equityCurvePercent = equityCurve.map(p => ({ date: p.date, percent: initialBalance > 0 ? ((p.balance - initialBalance) / initialBalance) * 100 : 0, isLive: p.isLive }));
    let peak = initialBalance;
    const drawdownData: { date: string; drawdown: number }[] = [];
    tradesOnlyEquity.forEach(point => { if (point.balance > peak) peak = point.balance; const dd = ((peak - point.balance) / peak) * 100; drawdownData.push({ date: point.date, drawdown: -dd }); });
    const pairPerformance = trades.reduce<Record<string, number>>((acc, t) => { acc[t.pair] = (acc[t.pair] || 0) + getNetResult(t); return acc; }, {});
    const qualityPerf = [1, 2, 3].map(q => { const qTrades = trades.filter(t => t.setupQuality === q); return { quality: '⭐'.repeat(q), profit: qTrades.reduce((s, t) => s + getNetResult(t), 0), count: qTrades.length }; });
    const strategyYes = trades.filter(t => t.strategyRespected);
    const strategyNo = trades.filter(t => !t.strategyRespected);
    const strategyPerf = [
      { label: 'Followed', profit: strategyYes.reduce((s, t) => s + getNetResult(t), 0), count: strategyYes.length },
      { label: 'Not Followed', profit: strategyNo.reduce((s, t) => s + getNetResult(t), 0), count: strategyNo.length },
    ];
    const exitDist = ['TP', 'SL', 'BE', 'Manual', 'Trail'].map(type => ({ type, count: trades.filter(t => t.exitType === type).length }));
    const profitDistribution = (() => {
      if (trades.length === 0) return [];
      const nets = trades.map(t => getNetResult(t));
      const min = Math.floor(Math.min(...nets) / 50) * 50;
      const max = Math.ceil(Math.max(...nets) / 50) * 50;
      const buckets: { range: string; count: number; isProfit: boolean }[] = [];
      for (let i = min; i < max; i += 50) { const count = nets.filter(n => n >= i && n < i + 50).length; if (count > 0) buckets.push({ range: `${i}`, count, isProfit: i >= 0 }); }
      return buckets;
    })();
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const profitByDayOfWeek = (() => {
      const map: Record<number, { profit: number; count: number }> = {};
      trades.forEach(t => { const day = new Date(t.date).getDay(); if (!map[day]) map[day] = { profit: 0, count: 0 }; map[day].profit += getNetResult(t); map[day].count += 1; });
      return [1, 2, 3, 4, 5].map(d => ({ day: dayNames[d], profit: map[d]?.profit || 0, count: map[d]?.count || 0 }));
    })();
    const profitByMonth = (() => {
      const map: Record<string, { profit: number; count: number }> = {};
      trades.forEach(t => { const key = t.date.substring(0, 7); if (!map[key]) map[key] = { profit: 0, count: 0 }; map[key].profit += getNetResult(t); map[key].count += 1; });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }));
    })();
    return { equityCurve, equityCurvePercent, drawdownData, pairPerformance: Object.entries(pairPerformance).map(([pair, profit]) => ({ pair, profit })), qualityPerf, strategyPerf, exitDist, profitDistribution, profitByDayOfWeek, profitByMonth };
  }, [trades, accountPayouts, initialBalance]);

  return { trades, allTrades, addTrade, addTrades, updateTrade, deleteTrade, stats, chartData };
};

export const useGlobalEquity = (allTrades: Trade[], accounts: Account[]) => {
  return useMemo(() => {
    if (allTrades.length === 0 || accounts.length === 0) return [];
    const sorted = [...allTrades].sort((a, b) => a.date.localeCompare(b.date));
    const totalInitial = accounts.reduce((s, a) => s + a.initialBalance, 0);
    let balance = totalInitial;
    return sorted.map(t => { balance += getNetResult(t); return { date: t.date, balance, isLive: !t.endDate }; });
  }, [allTrades, accounts]);
};

export const useGlobalEquityPercent = (allTrades: Trade[], accounts: Account[]) => {
  return useMemo(() => {
    if (allTrades.length === 0 || accounts.length === 0) return [];
    const sorted = [...allTrades].sort((a, b) => a.date.localeCompare(b.date));
    const accountBalMap = new Map(accounts.map(a => [a.id, a.initialBalance]));
    let cumPercent = 0;
    return sorted.map(t => {
      const bal = accountBalMap.get(t.accountId) || 1;
      cumPercent += (getNetResult(t) / bal) * 100;
      return { date: t.date, percent: cumPercent, isLive: !t.endDate };
    });
  }, [allTrades, accounts]);
};

export const useAccountPerformance = (allTrades: Trade[], accounts: Account[]) => {
  return useMemo(() => {
    return accounts.map(a => {
      const accountTrades = allTrades.filter(t => t.accountId === a.id);
      const profit = accountTrades.reduce((s, t) => s + getNetResult(t), 0);
      const profitPercent = a.initialBalance > 0 ? (profit / a.initialBalance) * 100 : 0;
      return { name: a.name, profit, profitPercent, trades: accountTrades.length };
    });
  }, [allTrades, accounts]);
};
