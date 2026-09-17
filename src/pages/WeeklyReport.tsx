import { useState, useMemo } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { useWeeklyReport, getWeekKey, getWeekRange, WeeklyReportData } from '@/hooks/useWeeklyReport';
import { Account } from '@/types/account';
import { Trade, getNetResult, getTradeScreenshots } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, Save, Star, Image, List, FileText, Eye, MessageSquare, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface WeeklyReportPageProps {
  activeAccount: Account | null;
  accounts: Account[];
}

const formatDate = (d: Date) => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const EMOTIONS = ['Excellent', 'Good', 'Neutral', 'Bad', 'Very Bad'];

const MAX_IMG_WIDTH = 1200;
const MAX_IMG_HEIGHT = 900;
const JPEG_QUALITY = 0.6;

const compressImage = (img: HTMLImageElement): string => {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > MAX_IMG_WIDTH) { h = Math.round(h * (MAX_IMG_WIDTH / w)); w = MAX_IMG_WIDTH; }
  if (h > MAX_IMG_HEIGHT) { w = Math.round(w * (MAX_IMG_HEIGHT / h)); h = MAX_IMG_HEIGHT; }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
};

const loadImageAsBase64 = (src: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (src.startsWith('data:')) {
      // Re-compress data URLs too
      const img = new window.Image();
      img.onload = () => resolve(compressImage(img));
      img.onerror = () => resolve(null);
      img.src = src;
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(compressImage(img));
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

const fmtK = (n: number) => Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(2);

// Single question block — numbered prompt + its input
const Question = ({ n, q, children }: { n: number; q: string; children: React.ReactNode }) => (
  <div className="space-y-2.5">
    <div className="flex items-start gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-primary/12 text-primary text-[11px] font-bold flex items-center justify-center">{n}</span>
      <p className="text-sm font-medium text-foreground leading-snug pt-0.5">{q}</p>
    </div>
    <div className="pl-9">{children}</div>
  </div>
);

const WeeklyReport = ({ activeAccount, accounts }: WeeklyReportPageProps) => {
  const { trades, allTrades } = useTrades(activeAccount?.id || null, activeAccount?.initialBalance || 0);
  const getAccountBalance = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc?.initialBalance || 1;
  };
  const tradePercentFn = (t: Trade) => (getNetResult(t) / getAccountBalance(t.accountId)) * 100;
  const { reports, getReport, saveReport } = useWeeklyReport();

  const [currentWeekKey, setCurrentWeekKey] = useState(() => getWeekKey(new Date()));
  const [previewImgs, setPreviewImgs] = useState<string[] | null>(null);
  const [view, setView] = useState<'edit' | 'all'>('all');
  const [commentingTradeId, setCommentingTradeId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());

  const weekRange = useMemo(() => getWeekRange(currentWeekKey), [currentWeekKey]);
  const report = useMemo(() => getReport(currentWeekKey), [getReport, currentWeekKey]);
  const [formData, setFormData] = useState<WeeklyReportData>(report);

  const [lastWeekKey, setLastWeekKey] = useState(currentWeekKey);
  const [lastReportSnapshot, setLastReportSnapshot] = useState('');
  const currentReportSnapshot = JSON.stringify(report);
  if (currentWeekKey !== lastWeekKey || currentReportSnapshot !== lastReportSnapshot) {
    setFormData(getReport(currentWeekKey));
    setLastWeekKey(currentWeekKey);
    setLastReportSnapshot(currentReportSnapshot);
  }

  const weekTrades = useMemo(() => {
    const startStr = weekRange.start.toISOString().slice(0, 10);
    const endStr = weekRange.end.toISOString().slice(0, 10);
    const source = activeAccount?.id === 'all' ? allTrades : trades;
    return source.filter(t => t.date >= startStr && t.date <= endStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trades, allTrades, weekRange, activeAccount]);

  const getWeekTrades = (weekKey: string) => {
    const range = getWeekRange(weekKey);
    const startStr = range.start.toISOString().slice(0, 10);
    const endStr = range.end.toISOString().slice(0, 10);
    const source = activeAccount?.id === 'all' ? allTrades : trades;
    return source.filter(t => t.date >= startStr && t.date <= endStr);
  };

  const allReports = useMemo(() => {
    return Object.values(reports).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }, [reports]);

  // Semaines regroupées par mois pour la grille annuelle
  const weeksByMonth = useMemo(() => {
    const groups: { weekKey: string; weekNum: number; start: Date; pnl: number; pct: number; tradeCount: number; wins: number; hasReport: boolean }[][] = Array.from({ length: 12 }, () => []);
    const jan1 = new Date(Date.UTC(viewYear, 0, 1));
    const dow = (jan1.getUTCDay() + 6) % 7;
    const cursor = new Date(jan1);
    cursor.setUTCDate(jan1.getUTCDate() - dow);
    for (let i = 0; i < 60; i++) {
      const wk = getWeekKey(cursor);
      const range = getWeekRange(wk);
      const startMonth = range.start.getUTCMonth();
      const startYear = range.start.getUTCFullYear();
      if (startYear > viewYear) break;
      if (startYear === viewYear) {
        const wTrades = getWeekTrades(wk);
        const pnl = wTrades.reduce((s, t) => s + getNetResult(t), 0);
        const pct = wTrades.reduce((s, t) => s + tradePercentFn(t), 0);
        const wins = wTrades.filter(t => getNetResult(t) > 0).length;
        const wn = (() => {
          const dt = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate()));
          dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
          const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
          return Math.ceil((((dt.getTime() - ys.getTime()) / 86400000) + 1) / 7);
        })();
        groups[startMonth].push({ weekKey: wk, weekNum: wn, start: range.start, pnl, pct, tradeCount: wTrades.length, wins, hasReport: !!reports[wk] });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return groups;
  }, [viewYear, reports, trades, allTrades]);

  // Stats globales pour l'année affichée
  const yearStats = useMemo(() => {
    const allWeeks = weeksByMonth.flat();
    const activeWeeks = allWeeks.filter(w => w.tradeCount > 0);
    const yearPnl = allWeeks.reduce((s, w) => s + w.pnl, 0);
    const yearPct = allWeeks.reduce((s, w) => s + w.pct, 0);
    const yearTrades = allWeeks.reduce((s, w) => s + w.tradeCount, 0);
    const yearWins = allWeeks.reduce((s, w) => s + w.wins, 0);
    const reportsFilled = allWeeks.filter(w => w.hasReport).length;
    const maxAbsPnl = allWeeks.reduce((m, w) => Math.max(m, Math.abs(w.pnl)), 0);
    let bestWeek: typeof allWeeks[number] | null = null;
    for (const w of activeWeeks) {
      if (!bestWeek || w.pnl > bestWeek.pnl) bestWeek = w;
    }
    return { totalWeeks: allWeeks.length, activeWeeks: activeWeeks.length, yearPnl, yearPct, yearTrades, yearWins, reportsFilled, bestWeek, maxAbsPnl };
  }, [weeksByMonth]);

  const stats = useMemo(() => {
    const totalProfit = weekTrades.reduce((s, t) => s + getNetResult(t), 0);
    const totalProfitPct = weekTrades.reduce((s, t) => s + tradePercentFn(t), 0);
    const wins = weekTrades.filter(t => getNetResult(t) > 0);
    const losses = weekTrades.filter(t => getNetResult(t) <= 0);
    const strategyRespected = weekTrades.filter(t => t.strategyRespected).length;
    const strategyPercent = weekTrades.length > 0 ? Math.round((strategyRespected / weekTrades.length) * 100) : 0;

    const winsNet = wins.reduce((s, t) => s + getNetResult(t), 0);
    const lossesNet = losses.reduce((s, t) => s + getNetResult(t), 0);
    const avgWin = wins.length > 0 ? winsNet / wins.length : 0;
    const avgLoss = losses.length > 0 ? lossesNet / losses.length : 0;
    const profitFactor = lossesNet !== 0 ? Math.abs(winsNet / lossesNet) : (winsNet > 0 ? Infinity : 0);

    let bestTrade: Trade | null = null;
    let worstTrade: Trade | null = null;
    for (const t of weekTrades) {
      const net = getNetResult(t);
      if (!bestTrade || net > getNetResult(bestTrade)) bestTrade = t;
      if (!worstTrade || net < getNetResult(worstTrade)) worstTrade = t;
    }

    const pairCounts: Record<string, number> = {};
    weekTrades.forEach(t => { pairCounts[t.pair] = (pairCounts[t.pair] || 0) + 1; });
    let mostTradedPair = '—';
    let mostTradedCount = 0;
    for (const [pair, count] of Object.entries(pairCounts)) {
      if (count > mostTradedCount) { mostTradedPair = pair; mostTradedCount = count; }
    }

    return {
      totalProfit, totalProfitPct, wins: wins.length, losses: losses.length, total: weekTrades.length, strategyPercent,
      avgWin, avgLoss, profitFactor, bestTrade, worstTrade, mostTradedPair, mostTradedCount,
    };
  }, [weekTrades, accounts]);

  const navigateWeek = (dir: number) => {
    const { start } = weekRange;
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + dir * 7);
    setCurrentWeekKey(getWeekKey(d));
  };

  const updateField = (field: keyof WeeklyReportData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTradeNote = (tradeId: string, note: string) => {
    setFormData(prev => ({
      ...prev,
      tradeNotes: { ...prev.tradeNotes, [tradeId]: note },
    }));
  };

  const handleSave = () => {
    saveReport({ ...formData, weekKey: currentWeekKey });
    toast.success('Report saved');
    setView('all');
  };

  const handleDownloadPDF = async (weekKey?: string, reportData?: WeeklyReportData, wTrades?: Trade[]) => {
    const targetWeekKey = weekKey || currentWeekKey;
    const targetData = reportData || formData;
    const targetRange = getWeekRange(targetWeekKey);
    const targetTrades = wTrades || weekTrades;

    const targetStats = (() => {
      const totalProfit = targetTrades.reduce((s, t) => s + getNetResult(t), 0);
      const wins = targetTrades.filter(t => getNetResult(t) > 0);
      const losses = targetTrades.filter(t => getNetResult(t) <= 0);
      const strategyRespected = targetTrades.filter(t => t.strategyRespected).length;
      const strategyPercent = targetTrades.length > 0 ? Math.round((strategyRespected / targetTrades.length) * 100) : 0;
      return { totalProfit, wins: wins.length, losses: losses.length, total: targetTrades.length, strategyPercent };
    })();

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 20;
    const checkPage = (needed: number) => { if (y + needed > 275) { pdf.addPage(); y = 20; } };

    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold');
    pdf.text('Weekly Trading Report', margin, y); y += 10;
    pdf.setFontSize(11); pdf.setFont('helvetica', 'normal');
    pdf.text(`${formatDate(targetRange.start)} - ${formatDate(targetRange.end)}`, margin, y); y += 12;
    pdf.setDrawColor(59, 130, 246); pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageW - margin, y); y += 10;

    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text('1 - Week Summary', margin, y); y += 8;
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    const summaryLines = [
      `Total performance: ${targetStats.totalProfit >= 0 ? '+' : ''}${targetStats.totalProfit.toFixed(2)}$`,
      `Number of trades: ${targetStats.total}`,
      `Winning trades: ${targetStats.wins}`, `Losing trades: ${targetStats.losses}`,
      `Overall emotion: ${targetData.emotionGenerale || 'Not specified'}`,
      `% strategy respected: ${targetStats.strategyPercent}%`,
      `Emotional trades: ${targetData.tradesEmotionnels}`,
    ];
    summaryLines.forEach(line => { checkPage(6); pdf.text(line, margin + 4, y); y += 6; }); y += 6;

    checkPage(12); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text('2 - Trade Analysis', margin, y); y += 8;
    const sortedTrades = [...targetTrades].sort((a, b) => a.date.localeCompare(b.date) || a.tradeNumber - b.tradeNumber);
    for (let i = 0; i < sortedTrades.length; i++) {
      const trade = sortedTrades[i]; const net = getNetResult(trade); const imgs = getTradeScreenshots(trade);
      checkPage(20); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
      pdf.text(`Trade ${i + 1}`, margin + 4, y); y += 6;
      pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
      pdf.text(`Pair: ${trade.pair}  ${net >= 0 ? '+' : ''}${net.toFixed(2)}$`, margin + 8, y); y += 5;
      pdf.text(`Strategy respected: ${trade.strategyRespected ? 'yes' : 'no'}`, margin + 8, y); y += 5;
      const note = targetData.tradeNotes[trade.id];
      if (note) { const nl = pdf.splitTextToSize(`Note: ${note}`, contentW - 12); checkPage(nl.length * 5); pdf.text(nl, margin + 8, y); y += nl.length * 5; }
      for (const imgSrc of imgs) {
        const base64 = await loadImageAsBase64(imgSrc);
        if (base64) {
          try {
            const imgW = contentW - 16;
            const imgProps = pdf.getImageProperties(base64);
            const imgH = (imgProps.height / imgProps.width) * imgW;
            const maxH = 180;
            const finalH = Math.min(imgH, maxH);
            const finalW = imgH > maxH ? (imgProps.width / imgProps.height) * maxH : imgW;
            checkPage(finalH + 5);
            pdf.addImage(base64, 'JPEG', margin + 8, y, finalW, finalH);
            y += finalH + 5;
          } catch {}
        }
      }
      y += 4;
    }
    if (targetTrades.length === 0) { pdf.setFontSize(10); pdf.setFont('helvetica', 'italic'); pdf.text('No trades this week.', margin + 4, y); y += 8; }

    checkPage(20); y += 4; pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text('3 - Conclusion', margin, y); y += 8;
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    const cl = pdf.splitTextToSize(targetData.conclusion || '(Not specified)', contentW - 8);
    checkPage(cl.length * 5); pdf.text(cl, margin + 4, y); y += cl.length * 5 + 6;

    checkPage(20); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text('4 - Next Week Plan', margin, y); y += 8; pdf.setFontSize(10);
    const planFields = [
      { label: 'Main objective', value: targetData.objectifPrincipal },
      { label: 'Secondary objectives', value: targetData.objectifsSecondaires },
      { label: 'Psychological points', value: targetData.pointsPsychologiques },
      { label: 'Solutions', value: targetData.solutions },
    ];
    for (const field of planFields) {
      checkPage(14); pdf.setFont('helvetica', 'bold'); pdf.text(`${field.label}:`, margin + 4, y); y += 5;
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(field.value || '(Not specified)', contentW - 12);
      checkPage(lines.length * 5); pdf.text(lines, margin + 8, y); y += lines.length * 5 + 4;
    }
    pdf.save(`weekly-report-${targetWeekKey}.pdf`);
    toast.success('PDF downloaded');
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getISOWeekNumber = (d: Date) => {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    return Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weekNum = getISOWeekNumber(weekRange.start);
  const yearProgress = Math.round((weekNum / 52) * 100);

  // Mini calendar: all cells for the month containing weekRange.start
  const miniYear  = weekRange.start.getUTCFullYear();
  const miniMonth = weekRange.start.getUTCMonth();
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const firstDow = (new Date(miniYear, miniMonth, 1).getDay() + 6) % 7; // Mon=0
  const miniCells: (number | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) miniCells.push(d);
  while (miniCells.length % 7) miniCells.push(null);

  const isInWeek = (d: number) => {
    const date = new Date(Date.UTC(miniYear, miniMonth, d));
    const s = weekRange.start; const e = weekRange.end;
    return date >= new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()))
      && date <= new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  };
  const todayUTC = new Date();
  const isToday = (d: number) =>
    d === todayUTC.getDate() && miniMonth === todayUTC.getMonth() && miniYear === todayUTC.getFullYear();

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No account selected.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-5">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Weekly Report</h1>
          <p className="text-xs text-muted-foreground">{activeAccount.name}</p>
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView('edit')}
            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'edit' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <FileText className="h-3.5 w-3.5" />Edit
          </button>
          <button onClick={() => setView('all')}
            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'all' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="h-3.5 w-3.5" />All Reports
          </button>
        </div>
      </div>

      {view === 'all' ? (
        /* ══════════════ SIMPLE LIST · weeks by trade count ══════════════ */
        <div className="max-w-xl mx-auto space-y-6">
          {/* Year selector */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setViewYear(y => y - 1)}
              className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-lg font-bold tracking-tight tabular-nums w-16 text-center">{viewYear}</span>
            <button onClick={() => setViewYear(y => y + 1)}
              className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Simple list — months → weeks, only trade count */}
          {(() => {
            const visibleMonths = MONTHS_LONG
              .map((monthName, mi) => ({ monthName, mi, weeks: weeksByMonth[mi].filter(w => w.tradeCount > 0 || w.hasReport) }))
              .filter(m => m.weeks.length > 0);
            if (visibleMonths.length === 0) {
              return <p className="text-center text-sm text-muted-foreground/60 py-12">No trades this year</p>;
            }
            return (
              <div className="space-y-5">
                {visibleMonths.map(({ monthName, mi, weeks }) => (
                  <div key={mi} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">{monthName}</p>
                    <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 overflow-hidden">
                      {weeks.map(w => (
                        <button key={w.weekKey}
                          onClick={() => { setCurrentWeekKey(w.weekKey); setView('edit'); }}
                          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-9 text-left">W{w.weekNum}</span>
                            <span className="text-sm font-medium text-foreground">
                              {MONTHS_SHORT[w.start.getUTCMonth()]} {w.start.getUTCDate()}
                            </span>
                            {w.hasReport && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Report saved" />}
                          </div>
                          <span className="text-sm font-mono text-muted-foreground tabular-nums">
                            {w.tradeCount} trade{w.tradeCount !== 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : (
        /* ══════════════ EDIT VIEW ══════════════ */
        <>
          {/* ── Minimal week header ── */}
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <button onClick={() => navigateWeek(-1)}
              className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-base font-bold tracking-tight">
                {MONTHS_LONG[weekRange.start.getUTCMonth()]} {weekRange.start.getUTCDate()} – {MONTHS_LONG[weekRange.end.getUTCMonth()]} {weekRange.end.getUTCDate()}
              </p>
              <p className="text-[11px] text-muted-foreground">Week {weekNum} · {weekRange.start.getUTCFullYear()}</p>
            </div>
            <button onClick={() => navigateWeek(1)}
              className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* ── Minimal week stats ── */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4 border-y border-border/40 max-w-3xl mx-auto">
            {[
              { label: 'P&L', value: `${stats.totalProfit >= 0 ? '+' : ''}${fmtK(stats.totalProfit)}$`, sub: `${stats.totalProfitPct >= 0 ? '+' : ''}${stats.totalProfitPct.toFixed(2)}%`, color: stats.totalProfit >= 0 ? 'text-profit' : 'text-loss' },
              { label: 'Trades', value: String(stats.total), sub: `${stats.wins}W · ${stats.losses}L`, color: 'text-foreground' },
              { label: 'Win Rate', value: stats.total > 0 ? `${Math.round((stats.wins / stats.total) * 100)}%` : '—', sub: '', color: 'text-foreground' },
              { label: 'Strategy', value: `${stats.strategyPercent}%`, sub: 'respected', color: 'text-foreground' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-lg font-bold font-mono leading-none ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* ── Questions, one by one ── */}
          <div className="space-y-7 max-w-3xl mx-auto">
            <Question n={1} q="How did you feel overall this week?">
              <Select value={formData.emotionGenerale} onValueChange={v => updateField('emotionGenerale', v)}>
                <SelectTrigger className="h-10 text-sm bg-secondary border-border"><SelectValue placeholder="Select an emotion..." /></SelectTrigger>
                <SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </Question>

            <Question n={2} q="How many emotional trades did you take?">
              <Input type="number" min={0} className="h-10 text-sm bg-secondary border-border max-w-[140px]" value={formData.tradesEmotionnels} onChange={e => updateField('tradesEmotionnels', parseInt(e.target.value) || 0)} />
            </Question>

            <Question n={3} q="What did you learn this week? What should you have done differently?">
              <Textarea placeholder="Your reflection..." className="h-28 text-sm resize-none bg-secondary border-border" value={formData.conclusion} onChange={e => updateField('conclusion', e.target.value)} />
            </Question>

            <Question n={4} q="What is your main objective for next week?">
              <Textarea placeholder="Main objective..." className="h-20 text-sm resize-none bg-secondary border-border" value={formData.objectifPrincipal} onChange={e => updateField('objectifPrincipal', e.target.value)} />
            </Question>

            <Question n={5} q="What are your secondary objectives?">
              <Textarea placeholder="Secondary objectives..." className="h-20 text-sm resize-none bg-secondary border-border" value={formData.objectifsSecondaires} onChange={e => updateField('objectifsSecondaires', e.target.value)} />
            </Question>

            <Question n={6} q="Which psychological points do you want to work on?">
              <Textarea placeholder="Psychological points..." className="h-20 text-sm resize-none bg-secondary border-border" value={formData.pointsPsychologiques} onChange={e => updateField('pointsPsychologiques', e.target.value)} />
            </Question>

            <Question n={7} q="What concrete solutions will you apply?">
              <Textarea placeholder="Concrete actions and solutions..." className="h-20 text-sm resize-none bg-secondary border-border" value={formData.solutions} onChange={e => updateField('solutions', e.target.value)} />
            </Question>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
              <Save className="h-3.5 w-3.5" />Save Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF()} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />Export PDF
            </Button>
          </div>

          {/* ── Trades & notes (minimal) ── */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Trades &amp; Notes</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{weekTrades.length} total</span>
            </div>
              <ScrollArea className="max-h-[420px]">
                {weekTrades.length === 0 ? (
                  <div className="p-8 text-center text-[11px] text-muted-foreground/60">No trades this week</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {weekTrades.map((trade, i) => {
                      const net = getNetResult(trade);
                      const imgs = getTradeScreenshots(trade);
                      const hasNote = !!formData.tradeNotes[trade.id];
                      const isCommenting = commentingTradeId === trade.id;
                      return (
                        <div key={trade.id} className="px-4 py-3 hover:bg-accent/20 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold font-mono text-foreground tabular-nums">
                              {net >= 0 ? '+' : ''}{fmtK(net)}$
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground/50">#{i+1}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.type === 'Buy' ? 'bg-profit/12 text-profit' : 'bg-loss/12 text-loss'}`}>
                              {trade.type === 'Buy' ? 'L' : 'S'}
                            </span>
                            <span className="text-xs font-semibold">{trade.pair}</span>
                            {!trade.endDate && (
                              <span className="text-[9px] font-bold px-1 rounded" style={{ backgroundColor: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 45%)' }}>
                                Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pl-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-mono ${net >= 0 ? 'text-profit/70' : 'text-loss/70'}`}>
                                {tradePercentFn(trade) >= 0 ? '+' : ''}{tradePercentFn(trade).toFixed(2)}%
                              </span>
                              {trade.endDate && (
                                <span className={`text-[9px] px-1.5 rounded font-medium ${
                                  trade.exitType === 'TP' ? 'text-profit' : trade.exitType === 'SL' ? 'text-loss' : 'text-muted-foreground'
                                }`}>{trade.exitType}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] ${trade.strategyRespected ? 'text-profit' : 'text-loss'}`}>
                                {trade.strategyRespected ? '✓' : '✗'}
                              </span>
                              {imgs.length > 0 && (
                                <button onClick={() => setPreviewImgs(imgs)} className="p-0.5 rounded hover:bg-accent/60">
                                  <Image className="h-3 w-3 text-primary" />
                                </button>
                              )}
                              <button onClick={() => setCommentingTradeId(isCommenting ? null : trade.id)}
                                className={`p-0.5 rounded hover:bg-accent/60 ${hasNote ? 'text-primary' : 'text-muted-foreground/50'}`}>
                                <MessageSquare className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {isCommenting && (
                            <div className="mt-2 pl-7 space-y-1">
                              <Textarea placeholder="Analysis note..." className="h-16 text-xs resize-none bg-secondary border-border"
                                value={formData.tradeNotes[trade.id] || ''} onChange={e => updateTradeNote(trade.id, e.target.value)} autoFocus />
                              <button onClick={() => setCommentingTradeId(null)} className="text-[9px] text-muted-foreground hover:text-foreground">Close</button>
                            </div>
                          )}
                          {!isCommenting && hasNote && (
                            <p className="text-[10px] text-muted-foreground/70 italic mt-1.5 pl-7 line-clamp-2 cursor-pointer" onClick={() => setCommentingTradeId(trade.id)}>
                              {formData.tradeNotes[trade.id]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
          </div>
        </>
      )}

      {/* Image preview */}
      <Dialog open={!!previewImgs} onOpenChange={() => setPreviewImgs(null)}>
        <DialogContent className="sm:max-w-2xl bg-card border-border p-2">
          {previewImgs && (
            <div className="space-y-2">
              {previewImgs.map((img, i) => (
                <img key={i} src={img} alt={`Screenshot ${i + 1}`} className="w-full rounded-md" />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-card border border-border rounded-lg p-3 space-y-1">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className={`text-lg font-bold font-mono ${color || 'text-foreground'}`}>{value}</p>
  </div>
);

export default WeeklyReport;
