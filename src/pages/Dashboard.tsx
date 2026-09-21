import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '@/hooks/useCountUp';
import { useTrades } from '@/hooks/useTrades';
import { Trade, getNetResult, getTradeR } from '@/types/trade';
import { Account } from '@/types/account';
import DashboardDateFilter, { DateRange } from '@/components/trading/DashboardDateFilter';
import EquityCurveChart from '@/components/trading/EquityCurveChart';
import EquityCurvePercentChart from '@/components/trading/EquityCurvePercentChart';
import ProfitPerTradeChart from '@/components/trading/ProfitPerTradeChart';
import DrawdownChart from '@/components/trading/DrawdownChart';
import PairPerformanceChart from '@/components/trading/PairPerformanceChart';
import ProfitByMonthChart from '@/components/trading/ProfitByMonthChart';
import { useRiskTable } from '@/hooks/useRiskTable';
import { useAccounts } from '@/hooks/useAccounts';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ─── Palette (fintech terminal, coherent accent per metric) ───────
const ACCENT = {
  balance: 'hsl(217, 91%, 60%)',
  teal:    'hsl(172, 66%, 46%)',
  rose:    'hsl(346, 77%, 55%)',
  amber:   'hsl(38, 92%, 55%)',
};

// ─── Progress bar (color shifts green → red with use) ────────────

function RiskBar({ usedPct, invert }: { usedPct: number; invert?: boolean }) {
  const c = Math.min(Math.max(usedPct, 0), 100);
  const color = invert
    ? (c >= 60 ? 'hsl(142,71%,45%)' : c >= 40 ? 'hsl(43,96%,56%)' : 'hsl(0,84%,60%)')
    : (c < 50 ? 'hsl(142,71%,45%)' : c < 75 ? 'hsl(43,96%,56%)' : c < 90 ? 'hsl(25,95%,53%)' : 'hsl(0,84%,60%)');
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Calendar heatmap ─────────────────────────────────────────────

function CalendarHeatmap({ dailyPnL }: { dailyPnL: Record<string, number> }) {
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const DAYS   = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Remember where the user scrolled this panel to, across page visits
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = localStorage.getItem('dashboard-heatmap-scroll');
    if (saved) el.scrollLeft = Number(saved);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => localStorage.setItem('dashboard-heatmap-scroll', String(el.scrollLeft)));
    };
    el.addEventListener('scroll', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const months = useMemo(() => {
    const today  = new Date();
    const maxAbs = Math.max(...Object.values(dailyPnL).map(Math.abs), 1);
    const dateKeys = Object.keys(dailyPnL);
    let startYear = today.getFullYear();
    let startMonth = today.getMonth();
    if (dateKeys.length > 0) {
      const earliest = dateKeys.reduce((a, b) => (a < b ? a : b));
      const [y, m] = earliest.split('-').map(Number);
      startYear = y;
      startMonth = m - 1;
    }
    const count = Math.max((today.getFullYear() - startYear) * 12 + (today.getMonth() - startMonth) + 1, 1);
    return Array.from({ length: count }, (_, m) => {
      const d = new Date(startYear, startMonth + m, 1);
      const year = d.getFullYear(), month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDow    = new Date(year, month, 1).getDay();
      const days: { date: string; pnl: number | null }[] = [];
      for (let i = 0; i < firstDow; i++) days.push({ date: '', pnl: null });
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        days.push({ date: dateStr, pnl: dailyPnL[dateStr] !== undefined ? dailyPnL[dateStr] : null });
      }
      return { year, month, days, maxAbs };
    });
  }, [dailyPnL]);

  const cellColor = (pnl: number | null, maxAbs: number) => {
    if (pnl === null) return 'transparent';
    if (pnl === 0)    return 'hsla(215,15%,55%,0.08)';
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    return pnl > 0
      ? `hsla(142,71%,45%,${(0.18 + intensity * 0.72).toFixed(2)})`
      : `hsla(0,84%,60%,${(0.18 + intensity * 0.72).toFixed(2)})`;
  };

  return (
    <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-1">
      {months.map(({ year, month, days, maxAbs }) => (
        <div key={`${year}-${month}`} className="flex flex-col gap-1.5 min-w-fit">
          <span className="text-[11px] font-semibold text-muted-foreground">{MONTHS[month]} {year}</span>
          <div className="grid grid-cols-7 gap-[3px]">
            {DAYS.map((d, i) => (
              <span key={i} className="text-[8px] text-muted-foreground/40 text-center leading-none pb-0.5 w-6">{d}</span>
            ))}
            {days.map((day, i) =>
              day.date === '' ? <div key={`pad-${i}`} className="w-6 h-6" /> : (
                <div key={day.date} className="w-6 h-6 rounded-[4px]"
                  style={{ backgroundColor: cellColor(day.pnl, maxAbs) }}
                  title={day.pnl !== null ? `${day.date}: ${day.pnl >= 0 ? '+' : ''}$${Math.abs(day.pnl).toFixed(0)}` : day.date} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Trade count slider ───────────────────────────────────────────

interface TradeLimit { label: string; value: number | null; }

function TradeCountSlider({ limits, value, onChange }: { limits: readonly TradeLimit[]; value: number | null; onChange: (v: number | null) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIdx = limits.findIndex(l => l.value === value);
  const pct = (activeIdx / (limits.length - 1)) * 100;
  const idxFromPtr = useCallback((e: React.PointerEvent) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (limits.length - 1));
  }, [limits.length]);
  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary border border-border/60">
      <span className="text-[11px] text-muted-foreground shrink-0 select-none">Last</span>
      <div className="relative flex flex-col gap-1.5 w-40 select-none">
        <div ref={trackRef} className="relative h-5 flex items-center cursor-pointer"
          onPointerDown={e => { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); onChange(limits[idxFromPtr(e)].value); }}
          onPointerMove={e => { if (e.buttons !== 1) return; onChange(limits[idxFromPtr(e)].value); }}>
          <div className="absolute inset-x-0 h-[3px] rounded-full bg-white/[0.08]" />
          <div className="absolute left-0 h-[3px] rounded-full transition-[width] duration-75"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,hsl(var(--primary)/0.4),hsl(var(--primary)))' }} />
          <div className="absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 transition-[left] duration-75"
            style={{ left: `${pct}%`, background: 'hsl(var(--primary))', boxShadow: '0 0 8px hsl(var(--primary)/0.5)' }} />
        </div>
        <div className="relative h-3">
          {limits.map((l, i) => (
            <span key={i} className={`absolute -translate-x-1/2 text-[9px] transition-colors duration-75 ${i === activeIdx ? 'text-primary font-semibold' : 'text-muted-foreground/40'}`}
              style={{ left: `${(i / (limits.length - 1)) * 100}%` }}>{l.label}</span>
          ))}
        </div>
      </div>
      <span className="text-[12px] font-bold text-foreground w-6 shrink-0 text-right tabular-nums">{value ?? '∞'}</span>
    </div>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────

function ChartCard({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <div className={`flex flex-col rounded-2xl border border-border/60 bg-card p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-card p-5 ${className ?? ''}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 w-full mt-7 mb-2.5">
      <span className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-foreground">{children}</span>
    </div>
  );
}

/** Reference-style KPI card: label + trend badge top row, big number, muted subtitle. */
function KpiCard({ label, value, prefix, badge, badgeUp, sub }: { label: string; value: string; prefix?: string; badge?: string; badgeUp?: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {badge && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${badgeUp ? 'bg-[hsla(142,71%,45%,0.12)] text-profit' : 'bg-[hsla(0,84%,60%,0.12)] text-loss'}`}>
            {badgeUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {badge}
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold font-mono tabular-nums text-foreground leading-none">
        {prefix && <span className="text-muted-foreground mr-0.5">{prefix}</span>}{value}
      </p>
      {sub && <p className="text-[12px] text-muted-foreground mt-2.5">{sub}</p>}
    </div>
  );
}

// ─── Types / constants ────────────────────────────────────────────

type StatsObj = {
  currentBalance: number; totalProfit: number; profitPercent: number; maxDrawdown: number;
  winRate: number; totalTrades: number; profitFactor: number; avgRR: number; avgTrade: number;
  wins: number; losses: number; bestTrade: number; worstTrade: number; expectancy: number;
  longestWinStreak: number; longestLossStreak: number; avgWin: number; avgLoss: number;
};

const CATEGORIES = ['All', 'Prop Firm', 'Personal', 'Demo'] as const;
type CategoryFilter = typeof CATEGORIES[number];
interface DashboardPageProps { activeAccount: Account | null; accounts: Account[]; }

const TRADE_LIMITS = [
  { label: 'All', value: null }, { label: '50', value: 50 }, { label: '40', value: 40 },
  { label: '30', value: 30 }, { label: '25', value: 25 }, { label: '20', value: 20 },
  { label: '15', value: 15 }, { label: '10', value: 10 }, { label: '5', value: 5 },
] as const;

const CAT_DOT: Record<string, string> = { 'Prop Firm': 'bg-balance', 'Personal': 'bg-profit', 'Demo': 'bg-drawdown' };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ISO-8601 week key, e.g. "2026-W26"
function isoWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ─── Dashboard ────────────────────────────────────────────────────

const Dashboard = ({ activeAccount, accounts }: DashboardPageProps) => {
  const navigate = useNavigate();
  const { getRiskForDrawdown } = useRiskTable();
  const { updateAccount } = useAccounts();
  const lastAppliedRiskRef = useRef<number | null>(null);
  const { trades: rawTrades, allTrades: rawAllTrades } = useTrades(activeAccount?.id || null, activeAccount?.initialBalance || 0);
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    try {
      const saved = localStorage.getItem('dashboard-date-range');
      return saved ? JSON.parse(saved) : { from: '', to: '' };
    } catch { return { from: '', to: '' }; }
  });
  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
    localStorage.setItem('dashboard-date-range', JSON.stringify(range));
  }, []);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(
    () => (localStorage.getItem('category-filter') as CategoryFilter) || 'All'
  );
  const setCategory = useCallback((cat: CategoryFilter) => {
    setCategoryFilter(cat); localStorage.setItem('category-filter', cat);
  }, []);
  const [tradeLimit, setTradeLimitState] = useState<number | null>(() => {
    const saved = localStorage.getItem('dashboard-trade-limit');
    return saved ? Number(saved) : null;
  });
  const setTradeLimit = useCallback((limit: number | null) => {
    setTradeLimitState(limit);
    if (limit === null) localStorage.removeItem('dashboard-trade-limit');
    else localStorage.setItem('dashboard-trade-limit', String(limit));
  }, []);
  const [view, setView] = useState<'account' | 'global'>(
    () => (localStorage.getItem('dashboard-view') as 'account' | 'global') || 'account'
  );
  const setDashView = useCallback((v: 'account' | 'global') => {
    setView(v); localStorage.setItem('dashboard-view', v);
  }, []);

  const filteredAccountIds = useMemo(() =>
    categoryFilter === 'All' ? null : accounts.filter(a => a.category === categoryFilter).map(a => a.id),
  [accounts, categoryFilter]);

  const filterTrades = useCallback((list: Trade[]) => {
    let f = list;
    if (filteredAccountIds) f = f.filter(t => filteredAccountIds.includes(t.accountId));
    if (dateRange.from) f = f.filter(t => t.date >= dateRange.from);
    if (dateRange.to)   f = f.filter(t => t.date <= dateRange.to);
    return f;
  }, [filteredAccountIds, dateRange]);

  const trades    = useMemo(() => { const f = filterTrades(rawTrades); return tradeLimit ? f.slice(-tradeLimit) : f; }, [rawTrades, filterTrades, tradeLimit]);
  const allTrades = useMemo(() => filterTrades(rawAllTrades), [rawAllTrades, filterTrades]);
  // When viewing "All accounts", the initial balance must reflect only the
  // accounts kept by the category filter — otherwise Balance mixes a filtered
  // P&L with an unfiltered starting capital.
  const initialBalance = useMemo(() => {
    if (!activeAccount) return 0;
    if (activeAccount.id === 'all') {
      const scoped = filteredAccountIds ? accounts.filter(a => filteredAccountIds.includes(a.id)) : accounts;
      return scoped.reduce((s, a) => s + a.initialBalance, 0);
    }
    return activeAccount.initialBalance || 0;
  }, [activeAccount, accounts, filteredAccountIds]);

  const stats = useMemo((): StatsObj => {
    const totalProfit = trades.reduce((s, t) => s + getNetResult(t), 0);
    const wins   = trades.filter(t => getNetResult(t) > 0);
    const losses = trades.filter(t => getNetResult(t) < 0);
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin  = wins.length   ? wins.reduce((s, t) => s + getNetResult(t), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + getNetResult(t), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length ? Infinity : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;
    const profitPercent = trades.reduce((sum, t) => {
      const b = accounts.find(a => a.id === t.accountId)?.initialBalance || 1;
      return sum + (getNetResult(t) / b) * 100;
    }, 0);
    const avgTrade   = trades.length ? totalProfit / trades.length : 0;
    const nets       = trades.map(t => getNetResult(t));
    const bestTrade  = nets.length ? Math.max(...nets) : 0;
    const worstTrade = nets.length ? Math.min(...nets) : 0;
    const expectancy = trades.length ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss : 0;
    let peak = initialBalance, maxDrawdown = 0, bal = initialBalance;
    trades.forEach(t => { bal += getNetResult(t); if (bal > peak) peak = bal; const dd = ((peak - bal) / peak) * 100; if (dd > maxDrawdown) maxDrawdown = dd; });
    let lWin = 0, lLoss = 0, cW = 0, cL = 0;
    trades.forEach(t => { const n = getNetResult(t); if (n > 0) { cW++; cL = 0; lWin = Math.max(lWin, cW); } else if (n < 0) { cL++; cW = 0; lLoss = Math.max(lLoss, cL); } else { cW = 0; cL = 0; } });
    return { currentBalance: initialBalance + totalProfit, totalProfit, profitPercent, maxDrawdown, winRate, totalTrades: trades.length, profitFactor, avgRR, avgTrade, wins: wins.length, losses: losses.length, bestTrade, worstTrade, expectancy, longestWinStreak: lWin, longestLossStreak: lLoss, avgWin, avgLoss };
  }, [trades, initialBalance, accounts]);

  const currentDrawdownPct = initialBalance > 0 ? Math.max(0, (initialBalance - stats.currentBalance) / initialBalance * 100) : 0;
  const applicableRule     = getRiskForDrawdown(currentDrawdownPct);
  const applicableRiskNum  = applicableRule ? parseFloat(applicableRule.risk) : NaN;

  useEffect(() => {
    if (!activeAccount || !applicableRule || isNaN(applicableRiskNum)) return;
    if (activeAccount.id === 'all') return;
    if (lastAppliedRiskRef.current === applicableRiskNum) return;
    if (applicableRiskNum === activeAccount.riskPct) { lastAppliedRiskRef.current = applicableRiskNum; return; }
    lastAppliedRiskRef.current = applicableRiskNum;
    const { id, ...rest } = activeAccount;
    updateAccount(id, { ...rest, riskPct: applicableRiskNum });
  }, [applicableRiskNum, activeAccount?.id]);

  // ── Daily P&L + derived ──────────────────────────────────────────
  const dailyPnL = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => { const d = t.date.substring(0, 10); map[d] = (map[d] || 0) + getNetResult(t); });
    return map;
  }, [trades]);

  const consistencyScore = useMemo(() => {
    const days = Object.values(dailyPnL);
    return days.length ? (days.filter(d => d > 0).length / days.length) * 100 : 0;
  }, [dailyPnL]);

  // ── Performance radar (8-axis "octagon" profile) ──────────────────
  const radarData = useMemo(() => {
    if (trades.length === 0) return [];

    const disciplineScore = (trades.filter(t => t.strategyRespected).length / trades.length) * 100;

    const avgQuality = trades.reduce((s, t) => s + t.setupQuality, 0) / trades.length;
    const qualityScore = ((avgQuality - 1) / 2) * 100;

    const rValues = trades
      .map(t => getTradeR(t, accounts.find(a => a.id === t.accountId)?.initialBalance || 0))
      .filter((r): r is number => r !== null);
    const avgR = rValues.length ? rValues.reduce((s, r) => s + r, 0) / rValues.length : 0;
    const avgRScore = Math.max(0, Math.min(avgR / 2, 1) * 100);

    const pfScore = stats.profitFactor === Infinity ? 100 : Math.max(0, Math.min(stats.profitFactor / 3, 1) * 100);
    const rrScore = Math.max(0, Math.min(stats.avgRR / 3, 1) * 100);
    const ddScore = Math.max(0, 100 - (Math.min(stats.maxDrawdown, 20) / 20) * 100);

    return [
      { metric: 'Win Rate',      value: stats.winRate,    raw: `${stats.winRate.toFixed(1)}%` },
      { metric: 'Profit Factor', value: pfScore,          raw: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2) },
      { metric: 'Risk/Reward',   value: rrScore,          raw: `${stats.avgRR.toFixed(2)}R` },
      { metric: 'Avg R',         value: avgRScore,        raw: `${avgR.toFixed(2)}R` },
      { metric: 'Discipline',    value: disciplineScore,  raw: `${disciplineScore.toFixed(0)}%` },
      { metric: 'Quality',       value: qualityScore,     raw: `${avgQuality.toFixed(1)}/3` },
      { metric: 'Consistency',   value: consistencyScore, raw: `${consistencyScore.toFixed(0)}%` },
      { metric: 'Drawdown Ctrl', value: ddScore,          raw: `${stats.maxDrawdown.toFixed(1)}%` },
    ];
  }, [trades, stats, consistencyScore, accounts]);

  const currentStreak = useMemo(() => {
    let count = 0; let type: 'win' | 'loss' | null = null;
    for (let i = trades.length - 1; i >= 0; i--) {
      const n = getNetResult(trades[i]);
      if (n === 0) break;
      const t = n > 0 ? 'win' : 'loss';
      if (!type) { type = t; count = 1; } else if (type === t) count++; else break;
    }
    return { type, count };
  }, [trades]);

  const last5 = useMemo(() =>
    trades.slice(-5).map(t => getNetResult(t) > 0 ? 'win' : getNetResult(t) < 0 ? 'loss' : 'be'),
  [trades]);

  const { bestDay, worstDay } = useMemo(() => {
    const vals = Object.values(dailyPnL);
    return vals.length ? { bestDay: Math.max(...vals), worstDay: Math.min(...vals) } : { bestDay: 0, worstDay: 0 };
  }, [dailyPnL]);

  const todayStr    = new Date().toISOString().substring(0, 10);
  const todayRawPnL = dailyPnL[todayStr] || 0;

  // ── Chart data ────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const equityCurveTrades = trades.reduce<{ date: string; balance: number; isLive?: boolean }[]>((acc, t, i) => {
      acc.push({ date: t.date, balance: (i === 0 ? initialBalance : acc[i - 1].balance) + getNetResult(t), isLive: !t.endDate });
      return acc;
    }, []);
    // Anchor the curve at the starting capital / 0% the day before the first trade,
    // so charts visibly start from the initial balance instead of jumping in mid-flight.
    const equityCurve = (() => {
      if (equityCurveTrades.length === 0) return equityCurveTrades;
      const d = new Date(trades[0].date);
      d.setDate(d.getDate() - 1);
      const startDate = d.toISOString().slice(0, 10);
      return [{ date: startDate, balance: initialBalance, isLive: false }, ...equityCurveTrades];
    })();
    const equityCurvePercent = equityCurve.map(p => ({
      date: p.date,
      percent: initialBalance > 0 ? ((p.balance - initialBalance) / initialBalance) * 100 : 0,
      isLive: p.isLive,
    }));
    let peak = initialBalance;
    const drawdownData = equityCurve.map(p => { if (p.balance > peak) peak = p.balance; return { date: p.date, drawdown: -((peak - p.balance) / peak) * 100 }; });
    const pairMap = trades.reduce<Record<string, number>>((acc, t) => { acc[t.pair] = (acc[t.pair] || 0) + getNetResult(t); return acc; }, {});
    const pct = (t: Trade) => { const b = accounts.find(a => a.id === t.accountId)?.initialBalance || 1; return (getNetResult(t) / b) * 100; };
    const qualityPerf  = [1, 2, 3].map(q => { const qt = trades.filter(t => t.setupQuality === q); return { quality: '★'.repeat(q), profit: qt.reduce((s, t) => s + pct(t), 0), count: qt.length }; });
    const sy = trades.filter(t => t.strategyRespected), sn = trades.filter(t => !t.strategyRespected);
    const strategyPerf = [{ label: 'Followed', profit: sy.reduce((s, t) => s + pct(t), 0), count: sy.length }, { label: 'Not Followed', profit: sn.reduce((s, t) => s + pct(t), 0), count: sn.length }];
    const exitDist     = ['TP', 'SL', 'BE', 'Manual', 'Trail'].map(type => ({ type, count: trades.filter(t => t.exitType === type).length }));
    const profitDistribution = (() => {
      if (!trades.length) return [];
      const nets = trades.map(t => getNetResult(t));
      const min = Math.floor(Math.min(...nets) / 50) * 50, max = Math.ceil(Math.max(...nets) / 50) * 50;
      const b: { range: string; count: number; isProfit: boolean }[] = [];
      for (let i = min; i < max; i += 50) { const c = nets.filter(n => n >= i && n < i + 50).length; if (c > 0) b.push({ range: `${i}`, count: c, isProfit: i >= 0 }); }
      return b;
    })();
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap: Record<number, { profit: number; count: number }> = {};
    trades.forEach(t => { const d = new Date(t.date).getDay(); if (!dayMap[d]) dayMap[d] = { profit: 0, count: 0 }; dayMap[d].profit += pct(t); dayMap[d].count++; });
    const profitByDayOfWeek = [1, 2, 3, 4, 5].map(d => ({ day: DAY_NAMES[d], profit: dayMap[d]?.profit || 0, count: dayMap[d]?.count || 0 }));
    const monthMap: Record<string, { profit: number; count: number }> = {};
    trades.forEach(t => { const k = t.date.substring(0, 7); if (!monthMap[k]) monthMap[k] = { profit: 0, count: 0 }; monthMap[k].profit += pct(t); monthMap[k].count++; });
    const profitByMonth = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({ month, ...d }));
    return { equityCurve, equityCurvePercent, drawdownData, pairPerformance: Object.entries(pairMap).map(([pair, profit]) => ({ pair, profit })), qualityPerf, strategyPerf, exitDist, profitDistribution, profitByDayOfWeek, profitByMonth };
  }, [trades, initialBalance]);

  // ── Global metrics (multi-account, by period) ─────────────────────
  const periodMetrics = useCallback((keyFn: (t: Trade) => string, labelFn: (k: string) => string) => {
    const map: Record<string, Trade[]> = {};
    allTrades.forEach(t => { const k = keyFn(t); (map[k] ||= []).push(t); });
    return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(key => {
      const ts = map[key];
      const pnl = ts.reduce((s, t) => s + getNetResult(t), 0);
      const wins = ts.filter(t => getNetResult(t) > 0);
      const losses = ts.filter(t => getNetResult(t) < 0);
      const winRate = ts.length ? (wins.length / ts.length) * 100 : 0;
      const grossWin = wins.reduce((s, t) => s + getNetResult(t), 0);
      const grossLoss = Math.abs(losses.reduce((s, t) => s + getNetResult(t), 0));
      const pf = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
      const rs = ts.map(t => getTradeR(t, accounts.find(a => a.id === t.accountId)?.initialBalance || 0)).filter((r): r is number => r !== null);
      const avgR = rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : 0;
      return { key, label: labelFn(key), trades: ts.length, winRate, pnl, pf, avgR };
    });
  }, [allTrades, accounts]);

  const monthlyMetrics = useMemo(() => periodMetrics(
    t => t.date.substring(0, 7),
    k => { const [y, m] = k.split('-'); return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`; },
  ), [periodMetrics]);

  const weeklyMetrics = useMemo(() => periodMetrics(
    t => isoWeek(t.date),
    k => k.replace('-W', ' · W'),
  ), [periodMetrics]);

  const globalSummary = useMemo(() => {
    const active = accounts.filter(a => a.status === 'active');
    const totalInitial = active.reduce((s, a) => s + (a.initialBalance || 0), 0);
    const pnl = allTrades.reduce((s, t) => s + getNetResult(t), 0);
    const wins = allTrades.filter(t => getNetResult(t) > 0);
    const losses = allTrades.filter(t => getNetResult(t) < 0);
    const grossWin = wins.reduce((s, t) => s + getNetResult(t), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + getNetResult(t), 0));
    const pf = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    const rs = allTrades.map(t => getTradeR(t, accounts.find(a => a.id === t.accountId)?.initialBalance || 0)).filter((r): r is number => r !== null);
    const avgR = rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : 0;
    return {
      totalBalance: totalInitial + pnl, pnl,
      winRate: allTrades.length ? (wins.length / allTrades.length) * 100 : 0,
      profitFactor: pf, avgR, totalTrades: allTrades.length,
    };
  }, [allTrades, accounts]);

  const pairPerformancePercent = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => { const b = accounts.find(a => a.id === t.accountId)?.initialBalance || 1; map[t.pair] = (map[t.pair] || 0) + (getNetResult(t) / b) * 100; });
    return Object.entries(map).map(([pair, percent]) => ({ pair, percent }));
  }, [trades, accounts]);

  const accountCards = useMemo(() =>
    accounts.filter(a => a.status === 'active').map(a => {
      const accountTrades = rawAllTrades.filter(t => t.accountId === a.id);
      const pnl = accountTrades.reduce((s, t) => s + getNetResult(t), 0);
      const pct = a.initialBalance > 0 ? (pnl / a.initialBalance) * 100 : 0;
      const liveCount = accountTrades.filter(t => !t.endDate).length;
      return { ...a, pnl, pct, liveCount };
    }),
  [accounts, rawAllTrades]);

  // Somme des % de performance de chaque compte (remplace Total Balance / Total P&L dans Global Overview)
  const sumAccountPct = useMemo(() => accountCards.reduce((s, a) => s + a.pct, 0), [accountCards]);

  const balanceAnimated    = useCountUp(stats.currentBalance, 900, 150);
  const fmt  = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtK = (n: number) => Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}K` : Math.abs(n).toFixed(2);

  const winRateColor = stats.winRate >= 50 ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)';
  const pfColor = stats.profitFactor >= 1 ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)';

  const goToMonth = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    navigate('/calendar', { state: { year: y, month: m - 1 } });
  };

  const renderMetricsTable = (rows: typeof monthlyMetrics, header: string) => {
    const isMonthly = header === 'Month';
    return (
    <Panel className="!p-0 overflow-hidden">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground p-5">No trades yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <th className="text-left font-semibold px-4 py-3">{header}</th>
                <th className="text-right font-semibold px-4 py-3">Trades</th>
                <th className="text-right font-semibold px-4 py-3">Win %</th>
                <th className="text-right font-semibold px-4 py-3">P&amp;L</th>
                <th className="text-right font-semibold px-4 py-3">PF</th>
                <th className="text-right font-semibold px-4 py-3">Avg RR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map(r => (
                <tr
                  key={r.key}
                  onClick={isMonthly ? () => goToMonth(r.key) : undefined}
                  className={`hover:bg-secondary/40 transition-colors ${isMonthly ? 'cursor-pointer' : ''}`}
                  title={isMonthly ? `Voir ${r.label} dans le calendrier` : undefined}
                >
                  <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{r.label}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{r.trades}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold" style={{ color: r.winRate >= 50 ? 'hsl(142,71%,45%)' : 'hsl(0,84%,60%)' }}>{r.winRate.toFixed(0)}%</td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums font-semibold ${r.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{r.pnl >= 0 ? '+' : ''}${fmt(r.pnl)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{r.pf === Infinity ? '∞' : r.pf.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{r.avgR.toFixed(2)}R</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    );
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">No account selected.</p>
          <p className="text-xs text-muted-foreground/60">Create an account to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-10">

      {/* ── Account chips ── */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {accountCards.map(a => {
            const isActive = a.id === activeAccount.id;
            const dot = CAT_DOT[a.category] || 'bg-muted-foreground';
            return (
              <div key={a.id} className={`shrink-0 flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all cursor-default
                ${isActive ? 'border-primary/40 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]' : 'border-border/50 bg-card hover:border-border'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
                    <span className="text-[11px] font-semibold text-foreground whitespace-nowrap leading-none">{a.name}</span>
                  </div>
                </div>
                <div className="h-7 w-px bg-border/40 shrink-0" />
                <div className="shrink-0">
                  <p className={`text-[15px] font-bold font-mono tabular-nums leading-tight ${a.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{a.pnl >= 0 ? '+' : ''}{a.pct.toFixed(1)}%</p>
                </div>
                <div className="h-7 w-px bg-border/40 shrink-0" />
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.liveCount > 0 && (
                    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
                    </span>
                  )}
                  <span className="text-[13px] font-bold font-mono text-foreground tabular-nums leading-tight">{a.liveCount}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-tight">open</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT.balance }} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Active Account</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">{activeAccount.name}</h1>
          <div className="flex items-center gap-1 mt-3">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`h-6 px-2.5 text-[11px] rounded-md font-medium transition-colors ${categoryFilter === cat ? 'bg-secondary border border-border/60 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <DashboardDateFilter value={dateRange} onChange={setDateRange} />
          <TradeCountSlider limits={TRADE_LIMITS} value={tradeLimit} onChange={setTradeLimit} />
        </div>
      </div>

      {/* ── View toggle: Account (principal) vs Global ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-card w-fit">
        {(['account', 'global'] as const).map(v => (
          <button key={v} onClick={() => setDashView(v)}
            className={`px-5 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${view === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {v === 'account' ? 'Account' : 'Global'}
          </button>
        ))}
      </div>

      {view === 'account' && (
      <>
      {/* ══════════════════════════════════════════
          SECTION 1 — KPI cards (4 separate cards, reference layout)
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Balance"
          prefix="$"
          value={fmt(balanceAnimated)}
          badge={`${stats.profitPercent >= 0 ? '+' : ''}${stats.profitPercent.toFixed(1)}%`}
          badgeUp={stats.profitPercent >= 0}
          sub={`${stats.totalProfit >= 0 ? '+' : ''}$${fmt(stats.totalProfit)} net`}
        />
        <KpiCard
          label="Today P&L"
          prefix="$"
          value={`${todayRawPnL >= 0 ? '+' : '-'}${fmt(Math.abs(todayRawPnL))}`}
          badge={`${todayRawPnL >= 0 ? '+' : ''}${(initialBalance > 0 ? (todayRawPnL / initialBalance) * 100 : 0).toFixed(2)}%`}
          badgeUp={todayRawPnL >= 0}
          sub={`Initial $${fmt(initialBalance)}`}
        />
        <KpiCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          badge={`${consistencyScore.toFixed(0)}% consistency`}
          badgeUp={consistencyScore >= 50}
          sub={`${stats.wins}W · ${stats.losses}L · ${stats.totalTrades} total`}
        />
        <KpiCard
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          badge={`${stats.profitFactor - 1 >= 0 ? '+' : ''}${(stats.profitFactor === Infinity ? 0 : stats.profitFactor - 1).toFixed(2)} vs 1.00`}
          badgeUp={stats.profitFactor >= 1}
          sub={`+$${fmt(stats.avgWin)} / -$${fmt(stats.avgLoss)} avg`}
        />
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — Activity heatmap + Equity performance
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Trading Activity" action={<span className="text-[11px] text-muted-foreground">Daily P&amp;L</span>}>
          <div className="h-[300px] flex flex-col justify-center gap-4">
            <CalendarHeatmap dailyPnL={dailyPnL} />
            <div className="flex items-center gap-1.5 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
              <span>Loss</span>
              <div className="flex gap-[2px]">
                {[0.85, 0.55, 0.3].map(o => <div key={`l${o}`} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: `hsla(0,84%,60%,${o})` }} />)}
                <div className="w-3 h-3 rounded-[2px] bg-white/[0.06]" />
                {[0.3, 0.55, 0.85].map(o => <div key={`p${o}`} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: `hsla(142,71%,45%,${o})` }} />)}
              </div>
              <span>Profit</span>
            </div>
          </div>
        </ChartCard>
        <ChartCard title="Equity Performance" action={<span className="text-[11px] text-muted-foreground">Balance · Average</span>}>
          <div className="h-[300px]">
            <EquityCurveChart data={chartData.equityCurve} medianLineVisible accentColor={ACCENT.balance} />
          </div>
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3 — Last trades + monthly preview
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Last 5 Trades" action={
          <button onClick={() => navigate('/trades')} className="text-[11px] font-medium text-primary hover:underline">View All</button>
        }>
          <div>
            {[...trades].slice(-5).reverse().map(t => {
              const net = getNetResult(t);
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${net >= 0 ? 'bg-profit' : 'bg-loss'}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{t.pair}</p>
                      <p className="text-[11px] text-muted-foreground">{t.type} · {t.date}</p>
                    </div>
                  </div>
                  <p className={`text-[13px] font-bold font-mono tabular-nums shrink-0 ${net >= 0 ? 'text-profit' : 'text-loss'}`}>{net >= 0 ? '+' : ''}${fmt(net)}</p>
                </div>
              );
            })}
            {trades.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No trades yet</p>}
          </div>
        </ChartCard>
        <ChartCard title="Monthly Performance" action={
          <button onClick={() => setDashView('global')} className="text-[11px] font-medium text-primary hover:underline">View All</button>
        }>
          <div>
            {[...monthlyMetrics].slice(-5).reverse().map(r => (
              <div key={r.key} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <p className="text-[13px] font-semibold text-foreground">{r.label}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">{r.trades} trades</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.pnl >= 0 ? 'bg-[hsla(142,71%,45%,0.12)] text-profit' : 'bg-[hsla(0,84%,60%,0.12)] text-loss'}`}>
                    {r.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {r.pnl >= 0 ? '+' : ''}${fmt(r.pnl)}
                  </span>
                </div>
              </div>
            ))}
            {monthlyMetrics.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>}
          </div>
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 4 — Account equity curves ($ + %) grouped on one row
      ══════════════════════════════════════════ */}
      <SectionLabel>Performance</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Equity Curve ($)">
          <div className="h-[340px]">
            <EquityCurveChart data={chartData.equityCurve} medianLineVisible accentColor={ACCENT.balance} />
          </div>
        </ChartCard>
        <ChartCard title="Performance (%)">
          <div className="h-[340px]">
            <EquityCurvePercentChart data={chartData.equityCurvePercent} medianLineVisible accentColor={ACCENT.teal} />
          </div>
        </ChartCard>
      </div>

      {/* ══════════════════════════════════════════
          Account charts — 2 per row
      ══════════════════════════════════════════ */}
      <SectionLabel>Trade Analysis</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Profit Per Trade">
          <div className="h-[300px]"><ProfitPerTradeChart trades={trades} accounts={accounts} medianLineVisible /></div>
        </ChartCard>
        <ChartCard title="Drawdown">
          <div className="h-[300px]"><DrawdownChart data={chartData.drawdownData} medianLineVisible accentColor={ACCENT.rose} /></div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pair Performance">
          <div className="h-[300px]"><PairPerformanceChart data={pairPerformancePercent} medianLineVisible accentColor={ACCENT.balance} /></div>
        </ChartCard>
        <ChartCard title="Profit by Month">
          <div className="h-[300px]"><ProfitByMonthChart data={chartData.profitByMonth} medianLineVisible usePercent /></div>
        </ChartCard>
      </div>
      </>
      )}

      {view === 'global' && (
      <>
      {/* ══════════════════════════════════════════
          GLOBAL VIEW — metrics only (no % charts)
      ══════════════════════════════════════════ */}
      <SectionLabel>Global Overview</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Sum of Account %', value: `${sumAccountPct >= 0 ? '+' : ''}${sumAccountPct.toFixed(2)}%`,                              cls: sumAccountPct >= 0 ? 'text-profit' : 'text-loss' },
          { label: 'Win Rate',      value: `${globalSummary.winRate.toFixed(1)}%`,                                                          cls: globalSummary.winRate >= 50 ? 'text-profit' : 'text-loss' },
          { label: 'Profit Factor', value: globalSummary.profitFactor === Infinity ? '∞' : globalSummary.profitFactor.toFixed(2),          cls: globalSummary.profitFactor >= 1 ? 'text-profit' : 'text-loss' },
          { label: 'Avg RR',        value: `${globalSummary.avgR.toFixed(2)}R`,                                                             cls: globalSummary.avgR >= 1 ? 'text-profit' : 'text-foreground' },
          { label: 'Total Trades',  value: globalSummary.totalTrades.toString(),                                                            cls: 'text-foreground' },
        ].map(({ label, value, cls }) => (
          <Panel key={label} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest">{label}</span>
            <p className={`text-2xl font-bold font-mono tabular-nums ${cls}`}>{value}</p>
          </Panel>
        ))}
      </div>

      <SectionLabel>Monthly Metrics</SectionLabel>
      {renderMetricsTable(monthlyMetrics, 'Month')}

      <SectionLabel>Weekly Metrics</SectionLabel>
      {renderMetricsTable(weeklyMetrics, 'Week')}
      </>
      )}

    </div>
  );
};

export default Dashboard;
