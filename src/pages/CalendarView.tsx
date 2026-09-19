import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTrades } from '@/hooks/useTrades';
import { useCalendarConfig, CALENDAR_WIDGET_DEFS } from '@/hooks/useDashboardConfig';
import { useEventColors } from '@/hooks/useEventColors';
import { useDailyJournal } from '@/hooks/useDailyJournal';
import DailyJournalDialog from '@/components/trading/DailyJournalDialog';
import { Account } from '@/types/account';
import { Trade, getNetResult } from '@/types/trade';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, BarChart3,
  EyeOff, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WidgetColorPicker } from '@/components/trading/WidgetColorPicker';

interface CalendarViewProps { activeAccount: Account | null; accounts: Account[] }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/* ────── helpers ────── */
const pad = (n: number) => String(n).padStart(2, '0');
const fmtK = (n: number) => Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(2);
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const toHsla = (hsl: string, a: number) => hsl.replace('hsl(', 'hsla(').replace(')', `, ${a})`);

const EVENT_LABELS: Record<string, string> = {
  challenge_realise: 'Challenge Passed',
  challenge_echoue:  'Challenge Failed',
  perte_compte:      'Account Blown',
};

const pnlColor = (pnl: number, intensity = 1) => {
  if (pnl > 0) return `hsla(142,71%,45%,${intensity})`;
  if (pnl < 0) return `hsla(0,84%,60%,${intensity})`;
  return 'transparent';
};

const pnlGradient = (pnl: number, intensity: number) => {
  if (pnl > 0) return `linear-gradient(135deg, hsla(142,71%,38%,${intensity}) 0%, hsla(142,71%,52%,${Math.max(0, intensity - 0.15)}) 100%)`;
  if (pnl < 0) return `linear-gradient(135deg, hsla(0,84%,52%,${intensity}) 0%, hsla(0,84%,65%,${Math.max(0, intensity - 0.15)}) 100%)`;
  return 'transparent';
};

const CATEGORIES = ['All', 'Prop Firm', 'Personal', 'Demo'] as const;
type CategoryFilter = typeof CATEGORIES[number];

const CalendarView = ({ activeAccount, accounts }: CalendarViewProps) => {
  const { trades: rawTrades } = useTrades(activeAccount?.id || null, activeAccount?.initialBalance || 0);
  const { configs, setWidgetColor, toggleWidget } = useCalendarConfig();
  const { colors: evtColors } = useEventColors();
  const { getJournal, saveJournal, deleteJournal } = useDailyJournal();

  // Navigated here from Dashboard's "Global > Monthly Metrics" table with a target month
  const location = useLocation();
  const targetMonth = location.state as { year?: number; month?: number } | null;

  const [editMode,       setEditMode]       = useState(false);
  const [journalDate,    setJournalDate]    = useState<string | null>(null);
  const [currentDate,    setCurrentDate]    = useState(() =>
    targetMonth?.year !== undefined && targetMonth?.month !== undefined
      ? new Date(targetMonth.year, targetMonth.month, 1)
      : new Date()
  );
  const [viewYear,       setViewYear]       = useState(() => targetMonth?.year ?? new Date().getFullYear());
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() =>
    (localStorage.getItem('category-filter') as CategoryFilter) || 'All'
  );
  const setCategory = useCallback((cat: CategoryFilter) => {
    setCategoryFilter(cat);
    localStorage.setItem('category-filter', cat);
  }, []);

  const trades = useMemo(() => {
    if (categoryFilter === 'All') return rawTrades;
    const ids = new Set(accounts.filter(a => a.category === categoryFilter).map(a => a.id));
    return rawTrades.filter(t => ids.has(t.accountId));
  }, [rawTrades, categoryFilter, accounts]);

  /* ── Year-table dataset: Demo accounts excluded (unless the Demo filter is explicitly selected) ── */
  const tableTrades = useMemo(() => {
    if (categoryFilter === 'Demo') return trades;
    const demoIds = new Set(accounts.filter(a => a.category === 'Demo').map(a => a.id));
    return trades.filter(t => !demoIds.has(t.accountId));
  }, [trades, categoryFilter, accounts]);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const isVisible  = (id: string) => configs.find(c => c.id === id)?.visible ?? true;
  const getColor   = (id: string) => configs.find(c => c.id === id)?.color || '';
  const getAcctBal = (aid: string) => accounts.find(a => a.id === aid)?.initialBalance || 1;
  const pct        = (t: Trade)   => (getNetResult(t) / getAcctBal(t.accountId)) * 100;

  /* ── Daily P&L maps ── */
  const buildDailyPnL = (list: Trade[]) => {
    const map: Record<string, { pnl: number; pct: number; count: number }> = {};
    list.forEach(t => {
      const d = t.endDate; if (!d) return;
      if (!map[d]) map[d] = { pnl: 0, pct: 0, count: 0 };
      map[d].pnl += getNetResult(t);
      map[d].pct += pct(t);
      map[d].count += 1;
    });
    return map;
  };
  const dailyPnL      = useMemo(() => buildDailyPnL(trades),      [trades, accounts]);
  const dailyPnLTable = useMemo(() => buildDailyPnL(tableTrades), [tableTrades, accounts]);

  /* ── Max abs daily % for intensity (% based, not $) ── */
  const maxMonthAbsPct = useMemo(() => {
    const monthStr = `${year}-${pad(month + 1)}`;
    const vals = Object.entries(dailyPnL)
      .filter(([d]) => d.startsWith(monthStr))
      .map(([, v]) => Math.abs(v.pct));
    return vals.length ? Math.max(...vals) : 1;
  }, [dailyPnL, year, month]);

  /* ── Monthly stats ── */
  const calcMonthlyStats = (list: Trade[], daily: Record<string, { pnl: number; pct: number; count: number }>, y: number, m: number) => {
    const ms = `${y}-${pad(m + 1)}`;
    let totalPnl = 0, totalPct = 0, winDays = 0, lossDays = 0, totalTrades = 0;
    let bestDay = { date: '', pnl: -Infinity, pct: 0 };
    let worstDay = { date: '', pnl: Infinity, pct: 0 };
    let tWin = 0, tLoss = 0, tWinPct = 0, tLossPct = 0, wCnt = 0, lCnt = 0;
    list.filter(t => t.endDate?.startsWith(ms)).forEach(t => {
      const n = getNetResult(t); const p = pct(t);
      if (n > 0) { tWin += n; tWinPct += p; wCnt++; }
      else if (n < 0) { tLoss += n; tLossPct += p; lCnt++; }
    });
    Object.entries(daily).forEach(([d, v]) => {
      if (!d.startsWith(ms)) return;
      totalPnl += v.pnl; totalPct += v.pct; totalTrades += v.count;
      if (v.pnl > 0) winDays++;
      else if (v.pnl < 0) lossDays++;
      if (v.pnl > bestDay.pnl)   bestDay  = { date: d, pnl: v.pnl, pct: v.pct };
      if (v.pnl < worstDay.pnl)  worstDay = { date: d, pnl: v.pnl, pct: v.pct };
    });
    return {
      totalPnl, totalPct, winDays, lossDays, totalTrades, bestDay, worstDay,
      avgWin: wCnt ? tWin / wCnt : 0, avgLoss: lCnt ? tLoss / lCnt : 0,
      avgWinPct: wCnt ? tWinPct / wCnt : 0, avgLossPct: lCnt ? tLossPct / lCnt : 0,
      winRate: totalTrades ? (wCnt / totalTrades) * 100 : 0,
      tWin, tLoss, tWinPct, tLossPct,
    };
  };
  const getMonthlyStats      = (y: number, m: number) => calcMonthlyStats(trades, dailyPnL, y, m);
  const getMonthlyStatsTable = (y: number, m: number) => calcMonthlyStats(tableTrades, dailyPnLTable, y, m);
  const ms = useMemo(() => getMonthlyStats(year, month), [dailyPnL, year, month]);

  /* ── Yearly stats — calculés directement depuis trades (incluant les live) ── */
  const calcYearStats = (list: Trade[]) => {
    const yearTrades = list.filter(t => (t.endDate || t.date).startsWith(`${viewYear}-`));
    const pnl = yearTrades.reduce((s, t) => s + getNetResult(t), 0);
    // net result (commission + swap déduits) pour que le % reste cohérent avec le $
    const pct = yearTrades.reduce((s, t) => s + (getNetResult(t) / getAcctBal(t.accountId)) * 100, 0);
    const w = yearTrades.filter(t => getNetResult(t) > 0).length;
    const l = yearTrades.filter(t => getNetResult(t) < 0).length;
    return { pnl, pct, trades: yearTrades.length, winRate: yearTrades.length ? (w / yearTrades.length) * 100 : 0, w, l };
  };
  const ys      = useMemo(() => calcYearStats(trades),      [trades, viewYear, accounts]);
  const ysTable = useMemo(() => calcYearStats(tableTrades), [tableTrades, viewYear, accounts]);

  /* ── Current streak ── */
  const streak = useMemo(() => {
    const sorted = Object.entries(dailyPnL).sort(([a], [b]) => b.localeCompare(a));
    let cnt = 0; let type: 'win' | 'loss' | null = null;
    for (const [, v] of sorted) {
      if (v.pnl === 0) break;
      const t = v.pnl > 0 ? 'win' : 'loss';
      if (!type) { type = t; cnt = 1; }
      else if (type === t) cnt++;
      else break;
    }
    return { count: cnt, type };
  }, [dailyPnL]);

  /* ── Week totals (for monthly calendar) ── */
  const weekTotals = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const fd = new Date(year, month, 1).getDay();
    const offset = fd === 0 ? 6 : fd - 1;
    const cells: (number | null)[] = [...Array(offset).fill(null)];
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks.map(wk =>
      wk.reduce<number>((sum, d) => {
        if (d === null) return sum;
        return sum + (dailyPnL[dateStr(year, month, d)]?.pnl || 0);
      }, 0)
    );
  }, [dailyPnL, year, month]);

  /* ── Heatmap weeks ── */
  const heatmapData = useMemo(() => {
    const jan1 = new Date(viewYear, 0, 1);
    const dow = jan1.getDay();
    const startOffset = dow === 0 ? 6 : dow - 1;
    const start = new Date(jan1); start.setDate(jan1.getDate() - startOffset);
    const weeks: { date: string; inYear: boolean; pnl?: number; pct?: number; count?: number }[][] = [];
    const cur = new Date(start);
    while (true) {
      const wk = [];
      for (let i = 0; i < 7; i++) {
        const ds = cur.toISOString().slice(0, 10);
        const inYear = cur.getFullYear() === viewYear;
        const data = dailyPnLTable[ds];
        wk.push({ date: ds, inYear, pnl: data?.pnl, pct: data?.pct, count: data?.count });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(wk);
      if (cur.getFullYear() > viewYear) break;
    }
    return weeks;
  }, [viewYear, dailyPnLTable]);

  const heatMaxPnl = useMemo(() => {
    const vals = Object.entries(dailyPnLTable)
      .filter(([d]) => d.startsWith(`${viewYear}-`))
      .map(([, v]) => Math.abs(v.pnl));
    return vals.length ? Math.max(...vals) : 1;
  }, [dailyPnLTable, viewYear]);

  /* ── Calendar grid ── */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fd = new Date(year, month, 1).getDay();
  const offset = fd === 0 ? 6 : fd - 1;
  const cells: (number | null)[] = [...Array(offset).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const today = new Date();

  /* ── Widget wrapper ── */
  const WW = ({ id, children }: { id: string; children: React.ReactNode }) => {
    if (!isVisible(id)) return null;
    const custom = getColor(id);
    const bg  = custom ? custom.replace('hsl(', 'hsla(').replace(')', ', 0.12)') : undefined;
    const bdr = custom ? custom.replace('hsl(', 'hsla(').replace(')', ', 0.35)') : undefined;
    const defaults: Record<string, string> = {
      'win-rate':      'hsla(var(--primary) / 0.12)',
      'best-day':      'hsla(142,71%,45%,0.12)',
      'worst-day':     'hsla(0,84%,60%,0.12)',
      'avg-win-loss':  'hsla(25,95%,53%,0.12)',
      'total-win-loss':'hsla(270,70%,55%,0.12)',
    };
    return (
      <div className={`rounded-xl p-3.5 border relative ${editMode ? 'ring-1 ring-primary/30' : ''}`}
        style={{ background: bg || defaults[id], borderColor: bdr }}>
        {editMode && (
          <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
            <WidgetColorPicker color={getColor(id)} onChange={c => setWidgetColor(id, c)} />
            <button onClick={() => toggleWidget(id)} className="p-1 rounded hover:bg-destructive/20">
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}
        {children}
      </div>
    );
  };

  if (!activeAccount) return (
    <div className="flex items-center justify-center h-[60vh]">
      <p className="text-muted-foreground text-sm">No account selected.</p>
    </div>
  );

  const hiddenWidgets = configs.filter(c => !c.visible);

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-page-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-primary to-foreground animate-gradient-x">
            Calendar
          </h1>
          <p className="text-xs text-muted-foreground">{activeAccount.name} · Daily P&L</p>
        </div>
      </div>

      {/* ── Category filters ── */}
      <div className="flex items-center gap-1.5">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`relative h-7 px-3 text-[11px] rounded-full font-semibold transition-all duration-300 overflow-hidden ${
              categoryFilter === cat
                ? 'text-primary-foreground shadow-[0_0_16px_-2px_hsl(var(--primary)/0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-border/50'
            }`}>
            {categoryFilter === cat && (
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-[hsl(270,90%,65%)] animate-gradient-x" />
            )}
            <span className="relative">{cat}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════ MONTHLY ═══════════════════════ */}
      <div className="space-y-4">
        <div className="relative rounded-2xl border border-border bg-card overflow-hidden">

            {/* Ambient glows */}
            <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_60%)] pointer-events-none" />
            <div className={`absolute inset-x-0 top-0 h-48 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,${
              ms.totalPnl >= 0 ? 'hsl(var(--profit)/0.08)' : 'hsl(var(--loss)/0.08)'
            },transparent_60%)]`} />

            {/* ── Header: nav + stats ── */}
            <div className="relative flex flex-wrap items-center gap-4 px-5 py-4 border-b border-border/50">

              {/* Month navigation */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg transition-transform hover:-translate-x-0.5" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span key={`${year}-${month}`} className="text-base font-black tracking-tight min-w-[130px] text-center animate-number-in">
                  {MONTHS[month]} {year}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg transition-transform hover:translate-x-0.5" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <button onClick={() => setCurrentDate(new Date())}
                  className="ml-1 h-6 px-2.5 text-[10px] font-medium rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:shadow-[0_0_12px_-4px_hsl(var(--primary)/0.6)] transition-all">
                  Today
                </button>
              </div>

            </div>

            {/* ── Day headers ── */}
            <div className="relative grid grid-cols-[repeat(7,1fr)_48px] gap-1 px-3 pt-3 pb-1">
              {DAYS_SHORT.map(d => (
                <div key={d} className="py-1 text-center text-[10px] font-semibold text-foreground uppercase tracking-wider">{d}</div>
              ))}
              <div className="py-1 text-center text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">Wk</div>
            </div>

            {/* ── Calendar weeks ── */}
            <div key={`grid-${year}-${month}`} className="relative px-3 pb-3 space-y-1">
              {weeks.map((wk, wi) => (
                <div key={wi} className="grid grid-cols-[repeat(7,1fr)_48px] gap-1">
                  {wk.map((d, di) => {
                    if (d === null) return (
                      <div key={di} className="h-28 rounded-xl animate-pop-in" style={{ animationDelay: `${(wi * 7 + di) * 14}ms`, border: '1.5px solid hsl(var(--border) / 0.15)' }} />
                    );
                    const ds      = dateStr(year, month, d);
                    const data    = dailyPnL[ds];
                    const isT     = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                    const isWkd   = di >= 5;
                    const jrnl    = getJournal(ds);
                    const evtKey  = jrnl?.event || null;
                    const evtColor = evtKey ? evtColors[evtKey as keyof typeof evtColors] : null;
                    const dayTrades = trades.filter(t => t.endDate === ds);
                    const stratOk = jrnl ? jrnl.strategyRespected
                      : dayTrades.length > 0 ? dayTrades.every(t => t.strategyRespected) : undefined;
                    const isBE    = data ? Math.abs(data.pct) <= 0.10 : false;
                    const col     = isBE ? '246,90%,63%' : data?.pnl > 0 ? '142,71%,45%' : '0,84%,60%';
                    return (
                      <div key={di} onClick={() => setJournalDate(ds)}
                        className={`group relative rounded-xl h-28 p-2 flex flex-col cursor-pointer select-none overflow-hidden animate-pop-in day-glow
                          transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:z-10
                          ${isT ? 'ring-2 ring-inset ring-primary animate-ring-pulse' : ''}
                          ${!data ? (isWkd ? '' : 'bg-card/40') : ''}`}
                        style={{
                          animationDelay: `${(wi * 7 + di) * 14}ms`,
                          '--cell-glow': data ? `hsla(${col},0.45)` : 'hsl(var(--primary) / 0.2)',
                          ...(data
                            ? {
                                backgroundImage: `linear-gradient(160deg, hsla(${col},0.22) 0%, hsla(${col},0.05) 75%)`,
                                border: `1.5px solid hsla(${col},0.55)`,
                              }
                            : { border: `1.5px solid hsl(var(--border) / ${isWkd ? '0.15' : '0.3'})` }),
                        } as React.CSSProperties}
                      >
                        {/* hover inner glow */}
                        {data && (
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                            style={{ background: `radial-gradient(ellipse at top, hsla(${col},0.18), transparent 65%)` }} />
                        )}

                        {/* Top: day# + strategy */}
                        <div className="relative flex items-center gap-1">
                          <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-shadow
                            ${isT ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.7)]' : 'text-foreground/90'}`}>
                            {d}
                          </span>
                          {stratOk !== undefined && (
                            stratOk
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-profit shrink-0 transition-transform group-hover:scale-125" />
                              : <XCircle className="h-3.5 w-3.5 text-loss shrink-0 transition-transform group-hover:scale-125" />
                          )}
                        </div>

                        {/* Center: P&L data */}
                        <div className="relative flex flex-1 items-center">
                          <div className="ml-auto text-right">
                            {data ? (
                              <>
                                <div className="font-mono text-[12px] font-bold text-foreground leading-tight tabular-nums transition-transform duration-300 group-hover:scale-110 origin-right">
                                  {data.pnl >= 0 ? '+' : ''}{fmtK(data.pnl)}$
                                </div>
                                <div className="font-mono text-[10px] text-foreground/70 tabular-nums">
                                  {data.pct >= 0 ? '+' : ''}{data.pct.toFixed(2)}%
                                </div>
                                <div className="text-[9px] text-foreground/45 mt-0.5">{data.count}tr</div>
                              </>
                            ) : !isWkd ? (
                              <span className="text-[11px] font-mono text-muted-foreground/20">—</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Event badge */}
                        {evtKey && evtColor && (
                          <div className="relative px-1.5 py-0.5 rounded text-[9px] font-bold uppercase w-full text-center truncate text-white shine"
                            style={{ backgroundColor: evtColor }}>
                            {EVENT_LABELS[evtKey]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Week total */}
                  <div className="h-28 rounded-xl flex flex-col items-center justify-center gap-0.5 animate-pop-in transition-colors"
                    style={{
                      animationDelay: `${(wi * 7 + 7) * 14}ms`,
                      border: '1.5px solid hsl(var(--border) / 0.2)',
                      background: weekTotals[wi] !== 0
                        ? `linear-gradient(180deg, ${pnlColor(weekTotals[wi], 0.10)}, transparent)`
                        : 'hsl(var(--secondary) / 0.2)',
                    }}>
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50">W{wi + 1}</span>
                    {weekTotals[wi] !== 0 ? (
                      <span className={`text-[11px] font-bold font-mono tabular-nums ${weekTotals[wi] > 0 ? 'text-profit' : 'text-loss'}`}>
                        {weekTotals[wi] >= 0 ? '+' : ''}{fmtK(weekTotals[wi])}$
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/25">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


      {journalDate && (
        <DailyJournalDialog
          open={!!journalDate}
          onOpenChange={o => { if (!o) setJournalDate(null); }}
          date={journalDate}
          dayTrades={trades.filter(t => t.endDate === journalDate)}
          dayPnL={dailyPnL[journalDate]?.pnl || 0}
          existing={getJournal(journalDate)}
          onSave={saveJournal}
          onDelete={deleteJournal}
          accounts={accounts}
        />
      )}
    </div>
  );
};

export default CalendarView;
