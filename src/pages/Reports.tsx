import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Account } from '@/types/account';
import { Trade, getNetResult, getTradeScreenshots } from '@/types/trade';
import { useTrades } from '@/hooks/useTrades';
import {
  PeriodReportData,
  PeriodType,
  getPeriodKey,
  getPeriodLabel,
  getPeriodRange,
  usePeriodReports,
} from '@/hooks/usePeriodReports';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Image,
  List,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ReportsProps {
  activeAccount: Account | null;
  accounts: Account[];
}

interface PeriodEntry {
  key: string;
  label: string;
  tradeCount: number;
  hasReport: boolean;
  pnl: number;
  wins: number;
}

const EMOTIONS = ['Excellent', 'Good', 'Neutral', 'Bad', 'Very Bad'];
const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

const SECTION_META: Record<PeriodType, { title: string; icon: typeof CalendarDays }> = {
  weekly: { title: 'Weekly Reports', icon: CalendarDays },
  monthly: { title: 'Monthly', icon: CalendarRange },
  yearly: { title: 'Yearly', icon: CalendarRange },
};

const periodWord = (type: PeriodType) => (
  type === 'weekly' ? 'week' : type === 'monthly' ? 'month' : 'year'
);

const periodStorageTitle = (type: PeriodType) => (
  type === 'weekly' ? 'Weekly Trading Report' : type === 'monthly' ? 'Monthly Trading Report' : 'Yearly Trading Report'
);

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const compressImage = (img: HTMLImageElement): string => {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const maxW = 1200;
  const maxH = 900;
  if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
  if (h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.6);
};

const loadImageAsBase64 = (src: string): Promise<string | null> =>
  new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(compressImage(img));
    img.onerror = () => resolve(null);
    img.src = src;
  });

const Question = ({
  n,
  q,
  children,
}: {
  n: number;
  q: string;
  children: ReactNode;
}) => (
  <div className="space-y-2.5">
    <div className="flex items-start gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-primary/12 text-primary text-[11px] font-bold flex items-center justify-center">
        {n}
      </span>
      <p className="text-sm font-medium text-foreground leading-snug pt-0.5">{q}</p>
    </div>
    <div className="pl-9">{children}</div>
  </div>
);

const Reports = ({ activeAccount, accounts }: ReportsProps) => {
  const { allTrades } = useTrades(activeAccount?.id || null, activeAccount?.initialBalance || 0);
  const { reports, getReport, saveReport } = usePeriodReports();

  const [open, setOpen] = useState<Record<PeriodType, boolean>>({
    weekly: true,
    monthly: false,
    yearly: false,
  });

  const [selected, setSelected] = useState<{ type: PeriodType; key: string } | null>(null);
  const [formData, setFormData] = useState<PeriodReportData>({
    emotionGenerale: '',
    tradesEmotionnels: 0,
    tradeNotes: {},
    conclusion: '',
    objectifPrincipal: '',
    objectifsSecondaires: '',
    pointsPsychologiques: '',
    solutions: '',
  });
  const [previewImgs, setPreviewImgs] = useState<string[] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const buildEntries = (type: PeriodType): PeriodEntry[] => {
    const keys = new Set<string>(Object.keys(reports[type]));
    for (const trade of allTrades) {
      keys.add(getPeriodKey(type, new Date(trade.date.slice(0, 10))));
    }
    return [...keys].map(key => {
      const range = getPeriodRange(type, key);
      const start = range.start.toISOString().slice(0, 10);
      const end = range.end.toISOString().slice(0, 10);
      const tradesInPeriod = allTrades.filter(t => t.date.slice(0, 10) >= start && t.date.slice(0, 10) <= end);
      return {
        key,
        label: getPeriodLabel(type, key),
        tradeCount: tradesInPeriod.length,
        hasReport: !!reports[type][key],
        pnl: tradesInPeriod.reduce((sum, t) => sum + getNetResult(t), 0),
        wins: tradesInPeriod.filter(t => getNetResult(t) > 0).length,
      };
    }).sort((a, b) => b.key.localeCompare(a.key));
  };

  const reportEntries: Record<PeriodType, PeriodEntry[]> = {
    weekly: buildEntries('weekly'),
    monthly: buildEntries('monthly'),
    yearly: buildEntries('yearly'),
  };

  useEffect(() => {
    if (selected) return;
    const first =
      reportEntries.weekly[0] ||
      reportEntries.monthly[0] ||
      reportEntries.yearly[0];
    if (first) {
      const type = reportEntries.weekly[0] ? 'weekly' : reportEntries.monthly[0] ? 'monthly' : 'yearly';
      setSelected({ type, key: first.key });
    }
  }, [reportEntries, selected]);

  useEffect(() => {
    if (!selected) return;
    const next = getReport(selected.type, selected.key);
    setFormData({
      emotionGenerale: next.emotionGenerale,
      tradesEmotionnels: next.tradesEmotionnels,
      tradeNotes: next.tradeNotes || {},
      conclusion: next.conclusion,
      objectifPrincipal: next.objectifPrincipal,
      objectifsSecondaires: next.objectifsSecondaires,
      pointsPsychologiques: next.pointsPsychologiques,
      solutions: next.solutions,
    });
  }, [selected?.type, selected?.key, getReport]);

  const selectedTrades = useMemo(() => {
    if (!selected) return [] as Trade[];
    const range = getPeriodRange(selected.type, selected.key);
    const start = range.start.toISOString().slice(0, 10);
    const end = range.end.toISOString().slice(0, 10);
    return allTrades
      .filter(t => t.date.slice(0, 10) >= start && t.date.slice(0, 10) <= end)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.tradeNumber || 0) - (b.tradeNumber || 0));
  }, [allTrades, selected]);

  const stats = useMemo(() => {
    const total = selectedTrades.length;
    const wins = selectedTrades.filter(t => getNetResult(t) > 0).length;
    const losses = selectedTrades.filter(t => getNetResult(t) <= 0).length;
    const pnl = selectedTrades.reduce((sum, t) => sum + getNetResult(t), 0);
    const strategy = total ? Math.round((selectedTrades.filter(t => t.strategyRespected).length / total) * 100) : 0;
    const winRate = total ? Math.round((wins / total) * 100) : 0;
    const winsNet = selectedTrades.filter(t => getNetResult(t) > 0).reduce((s, t) => s + getNetResult(t), 0);
    const lossesNet = selectedTrades.filter(t => getNetResult(t) <= 0).reduce((s, t) => s + getNetResult(t), 0);
    const profitFactor = lossesNet !== 0 ? Math.abs(winsNet / lossesNet) : winsNet > 0 ? Infinity : 0;
    const best = selectedTrades.length ? Math.max(...selectedTrades.map(getNetResult)) : 0;
    const worst = selectedTrades.length ? Math.min(...selectedTrades.map(getNetResult)) : 0;
    const avgWin = wins ? winsNet / wins : 0;
    const avgLoss = losses ? lossesNet / losses : 0;

    return { total, wins, losses, pnl, strategy, winRate, profitFactor, best, worst, avgWin, avgLoss };
  }, [selectedTrades]);

  const getAccountBalance = (accountId: string) =>
    accounts.find(a => a.id === accountId)?.initialBalance || activeAccount?.initialBalance || 1;

  const updateField = (field: keyof PeriodReportData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const updateTradeNote = (tradeId: string, note: string) =>
    setFormData(prev => ({ ...prev, tradeNotes: { ...prev.tradeNotes, [tradeId]: note } }));

  const selectPeriod = (type: PeriodType, key: string) => {
    setSelected({ type, key });
    setIsEditing(false);
    setOpen(prev => ({ ...prev, [type]: true }));
  };

  const createCurrent = (type: PeriodType) => {
    const key = getPeriodKey(type, new Date());
    selectPeriod(type, key);
  };

  const handleSave = async () => {
    if (!selected) return;
    await saveReport(selected.type, selected.key, formData);
    toast.success('Report saved');
    setIsEditing(false);
  };

  const handleDownloadPDF = async (mode: 'download' | 'view' | 'blob' = 'download'): Promise<string | undefined> => {
    if (!selected) return;

    const title = periodStorageTitle(selected.type);
    const range = getPeriodRange(selected.type, selected.key);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 20;

    const checkPage = (needed: number) => {
      if (y + needed > 275) {
        pdf.addPage();
        y = 20;
      }
    };

    const winRate = stats.total ? Math.round((stats.wins / stats.total) * 100) : 0;
    const kpis = [
      ['TOTAL P&L', `${fmt(stats.pnl)}$`],
      ['TRADES', String(stats.total)],
      ['WIN RATE', `${winRate}%`],
      ['STRATEGY', `${stats.strategy}%`],
    ];

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, y);
    y += 8;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${formatDate(range.start)} – ${formatDate(range.end)}`, margin, y);
    y += 12;
    pdf.setDrawColor(80, 80, 90);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    const boxGap = 4;
    const boxW = (contentW - boxGap * 3) / 4;
    const boxH = 22;
    kpis.forEach(([label, value], i) => {
      const x = margin + i * (boxW + boxGap);
      pdf.setFillColor(248, 248, 250);
      pdf.setDrawColor(220, 220, 224);
      pdf.roundedRect(x, y, boxW, boxH, 2, 2, 'FD');
      pdf.setFontSize(7.5);
      pdf.setTextColor(125, 125, 133);
      pdf.text(label, x + 3.5, y + 7.5);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      pdf.text(value, x + 3.5, y + 17);
    });
    y += boxH + 10;
    pdf.setTextColor(0, 0, 0);

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`1 - ${selected.type === 'weekly' ? 'Week' : selected.type === 'monthly' ? 'Month' : 'Year'} Summary`, margin, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    for (const line of [
      `Winning trades: ${stats.wins}`,
      `Losing trades: ${stats.losses}`,
      `Overall emotion: ${formData.emotionGenerale || 'Not specified'}`,
      `Emotional trades: ${formData.tradesEmotionnels}`,
    ]) {
      checkPage(6);
      pdf.text(line, margin + 4, y);
      y += 6;
    }
    y += 4;

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('2 - Trade Analysis', margin, y);
    y += 8;

    for (let i = 0; i < selectedTrades.length; i++) {
      const trade = selectedTrades[i];
      const net = getNetResult(trade);
      checkPage(18);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Trade ${i + 1}`, margin + 4, y);
      y += 6;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Pair: ${trade.pair}  ${net >= 0 ? '+' : ''}${net.toFixed(2)}$`, margin + 8, y);
      y += 5;
      pdf.text(`Strategy respected: ${trade.strategyRespected ? 'yes' : 'no'}`, margin + 8, y);
      y += 5;

      const note = formData.tradeNotes[trade.id] || trade.notes;
      if (note) {
        const noteLines = pdf.splitTextToSize(`Note: ${note}`, contentW - 12);
        checkPage(noteLines.length * 5);
        pdf.text(noteLines, margin + 8, y);
        y += noteLines.length * 5;
      }

      for (const src of getTradeScreenshots(trade)) {
        const base64 = await loadImageAsBase64(src);
        if (!base64) continue;
        try {
          const props = pdf.getImageProperties(base64);
          const imgW = contentW - 16;
          const rawH = (props.height / props.width) * imgW;
          const finalH = Math.min(rawH, 170);
          const finalW = rawH > 170 ? (props.width / props.height) * 170 : imgW;
          checkPage(finalH + 5);
          pdf.addImage(base64, 'JPEG', margin + 8, y, finalW, finalH);
          y += finalH + 5;
        } catch {
          // Ignore a broken screenshot in PDF generation.
        }
      }
      y += 4;
    }

    if (selectedTrades.length === 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('No trades in this period.', margin + 4, y);
      y += 8;
    }

    const noun = periodWord(selected.type);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    checkPage(20);
    pdf.text('3 - Reflection', margin, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const reflection = pdf.splitTextToSize(formData.conclusion || '(Not specified)', contentW - 8);
    pdf.text(reflection, margin + 4, y);
    y += reflection.length * 5 + 8;

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    checkPage(20);
    pdf.text(`4 - Next ${noun} Plan`, margin, y);
    y += 8;
    pdf.setFontSize(10);
    for (const field of [
      ['Main objective', formData.objectifPrincipal],
      ['Secondary objectives', formData.objectifsSecondaires],
      ['Psychological points', formData.pointsPsychologiques],
      ['Solutions', formData.solutions],
    ] as [string, string][]) {
      checkPage(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${field[0]}:`, margin + 4, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(field[1] || '(Not specified)', contentW - 12);
      pdf.text(lines, margin + 8, y);
      y += lines.length * 5 + 4;
    }

    if (mode === 'blob') {
      return pdf.output('bloburl') as unknown as string;
    }

    if (mode === 'view') {
      window.open(pdf.output('bloburl') as unknown as string, '_blank');
      return;
    }

    pdf.save(`${selected.type}-report-${selected.key}.pdf`);
    toast.success('PDF downloaded');
    return undefined;
  };

  // Generate the PDF automatically so the report is visible immediately.
  useEffect(() => {
    if (!selected || isEditing) return;
    let cancelled = false;
    setPdfLoading(true);

    (async () => {
      try {
        const url = await handleDownloadPDF('blob');
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setPdfUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url || null;
        });
      } catch {
        if (!cancelled) setPdfUrl(null);
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selected?.type,
    selected?.key,
    isEditing,
    JSON.stringify(formData),
    selectedTrades.map(t => t.id).join('|'),
  ]);

  useEffect(() => () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No account selected.</p>
      </div>
    );
  }

  const currentMeta = selected ? SECTION_META[selected.type] : SECTION_META.weekly;
  const selectedSaved = selected ? !!reports[selected.type][selected.key] : false;
  const selectedEntry = selected
    ? reportEntries[selected.type].find(e => e.key === selected.key)
    : undefined;

  return (
    <div className="w-full h-full">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Journal</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly, monthly and yearly trading reviews in one place.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left navigation — three connected dropdowns */}
        <aside className="w-full lg:w-[300px] shrink-0 rounded-2xl border border-border/60 bg-card overflow-hidden">
          {(['weekly', 'monthly', 'yearly'] as PeriodType[]).map((type, sectionIndex) => {
            const meta = SECTION_META[type];
            const Icon = meta.icon;
            const isOpen = open[type];

            return (
              <section key={type} className={sectionIndex > 0 ? 'border-t border-border/50' : ''}>
                <button
                  onClick={() => setOpen(prev => ({ ...prev, [type]: !prev[type] }))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/40 transition-colors"
                >
                  <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-foreground flex-1">{meta.title}</span>
                  <span className="text-[10px] text-muted-foreground mr-1">{reportEntries[type].length}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-border/40 bg-background/20 max-h-[340px] overflow-auto">
                    {reportEntries[type].length === 0 ? (
                      <div className="px-4 py-5 text-xs text-muted-foreground text-center">
                        No reports or trades yet.
                      </div>
                    ) : (
                      reportEntries[type].map(entry => {
                        const active = selected?.type === type && selected.key === entry.key;
                        return (
                          <button
                            key={entry.key}
                            onClick={() => selectPeriod(type, entry.key)}
                            className={`w-full text-left px-4 py-3 border-b border-border/30 last:border-0 transition-colors ${
                              active ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/35'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">{entry.label}</span>
                              {entry.hasReport && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Saved report" />}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-muted-foreground">{entry.tradeCount} trades</span>
                              <span className={`text-[10px] font-mono tabular-nums ${entry.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {fmt(entry.pnl)}$
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}

                    <button
                      onClick={() => createCurrent(type)}
                      className="w-full px-4 py-3 text-left text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      + Create current {periodWord(type)} report
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </aside>

        {/* Right detail */}
        <section className="flex-1 min-w-0 rounded-2xl border border-border/60 bg-card overflow-hidden">
          {!selected ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Select a report</p>
              <p className="text-xs text-muted-foreground mt-1">Choose a period from the left.</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-border/50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <currentMeta.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{currentMeta.title}</span>
                    {selectedSaved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-profit/10 text-profit">Saved</span>}
                    {!selectedSaved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Not saved</span>}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{selectedEntry?.label || getPeriodLabel(selected.type, selected.key)}</h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isEditing ? (
                    <>
                      <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs">
                        <Edit3 className="h-3.5 w-3.5" />Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF()} className="gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5" />Export PDF
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); }} className="gap-1.5 text-xs">
                        Annuler
                      </Button>
                      <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
                        <Save className="h-3.5 w-3.5" />Enregistrer
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'P&L', value: `${fmt(stats.pnl)}$`, color: stats.pnl >= 0 ? 'text-profit' : 'text-loss' },
                    { label: 'Trades', value: String(stats.total), color: 'text-foreground' },
                    { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'text-profit' : 'text-loss' },
                    { label: 'Strategy', value: `${stats.strategy}%`, color: stats.strategy >= 70 ? 'text-profit' : 'text-loss' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-border/60 bg-background/30 p-4">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
                      <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ['Profit Factor', stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)],
                    ['Avg Win', `${stats.avgWin >= 0 ? '+' : ''}${stats.avgWin.toFixed(2)}$`],
                    ['Avg Loss', `${stats.avgLoss.toFixed(2)}$`],
                    ['Best / Worst', `${stats.best.toFixed(2)} / ${stats.worst.toFixed(2)}$`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border/50 px-3 py-3">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold font-mono mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-7 max-w-3xl">
                  <Question n={1} q={`How did you feel overall this ${periodWord(selected.type)}?`}>
                    <Select value={formData.emotionGenerale} onValueChange={v => updateField('emotionGenerale', v)}>
                      <SelectTrigger className="h-10 text-sm bg-secondary border-border">
                        <SelectValue placeholder="Select an emotion..." />
                      </SelectTrigger>
                      <SelectContent>{EMOTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </Question>

                  <Question n={2} q={`How many emotional trades did you take this ${periodWord(selected.type)}?`}>
                    <Input
                      type="number"
                      min={0}
                      className="h-10 text-sm bg-secondary border-border max-w-[140px]"
                      value={formData.tradesEmotionnels}
                      onChange={e => updateField('tradesEmotionnels', parseInt(e.target.value) || 0)}
                    />
                  </Question>

                  <Question n={3} q={`What did you learn this ${periodWord(selected.type)}? What should you have done differently?`}>
                    <Textarea
                      placeholder="Your reflection..."
                      className="h-28 text-sm resize-none bg-secondary border-border"
                      value={formData.conclusion}
                      onChange={e => updateField('conclusion', e.target.value)}
                    />
                  </Question>

                  <Question n={4} q={`What is your main objective for next ${periodWord(selected.type)}?`}>
                    <Textarea
                      placeholder="Main objective..."
                      className="h-20 text-sm resize-none bg-secondary border-border"
                      value={formData.objectifPrincipal}
                      onChange={e => updateField('objectifPrincipal', e.target.value)}
                    />
                  </Question>

                  <Question n={5} q="What are your secondary objectives?">
                    <Textarea
                      placeholder="Secondary objectives..."
                      className="h-20 text-sm resize-none bg-secondary border-border"
                      value={formData.objectifsSecondaires}
                      onChange={e => updateField('objectifsSecondaires', e.target.value)}
                    />
                  </Question>

                  <Question n={6} q="Which psychological points do you want to work on?">
                    <Textarea
                      placeholder="Psychological points..."
                      className="h-20 text-sm resize-none bg-secondary border-border"
                      value={formData.pointsPsychologiques}
                      onChange={e => updateField('pointsPsychologiques', e.target.value)}
                    />
                  </Question>

                  <Question n={7} q="What concrete solutions will you apply?">
                    <Textarea
                      placeholder="Concrete actions and solutions..."
                      className="h-20 text-sm resize-none bg-secondary border-border"
                      value={formData.solutions}
                      onChange={e => updateField('solutions', e.target.value)}
                    />
                  </Question>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Trades & Notes</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{selectedTrades.length} total</span>
                  </div>

                  {selectedTrades.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">No trades in this period.</div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {selectedTrades.map((trade, index) => {
                        const net = getNetResult(trade);
                        const imgs = getTradeScreenshots(trade);
                        const note = formData.tradeNotes[trade.id] ?? trade.notes ?? '';
                        return (
                          <div key={trade.id} className="px-4 py-3 hover:bg-accent/20 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-bold font-mono tabular-nums ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {fmt(net)}$
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground/50">#{index + 1}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.type === 'Buy' ? 'bg-profit/12 text-profit' : 'bg-loss/12 text-loss'}`}>
                                {trade.type === 'Buy' ? 'L' : 'S'}
                              </span>
                              <span className="text-xs font-semibold">{trade.pair}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">{trade.date.slice(0, 10)}</span>
                            </div>

                            <div className="flex items-start gap-2 mt-2">
                              <Textarea
                                className="min-h-16 text-xs resize-none bg-secondary border-border"
                                placeholder="Analysis note..."
                                value={note}
                                onChange={e => updateTradeNote(trade.id, e.target.value)}
                              />
                              {imgs.length > 0 && (
                                <button
                                  onClick={() => setPreviewImgs(imgs)}
                                  className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center hover:bg-accent/50 shrink-0"
                                  title="View screenshots"
                                >
                                  <Image className="h-4 w-4 text-primary" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={handleSave} className="gap-1.5 text-xs">
                    <Save className="h-3.5 w-3.5" />Save Report
                  </Button>
                  <Button variant="outline" onClick={() => handleDownloadPDF('view')} className="gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" />View PDF
                  </Button>
                </div>
              </div>
              ) : (
                <div className="p-3">
                  <div className="relative rounded-xl border border-border/60 bg-background/20 overflow-hidden" style={{ height: 'calc(100vh - 14rem)', minHeight: '520px' }}>
                    {pdfLoading || !pdfUrl ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                        <div className="h-5 w-5 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
                        Génération du PDF…
                      </div>
                    ) : (
                      <iframe
                        src={`${pdfUrl}#toolbar=1&navpanes=0&zoom=100`}
                        title="Trading report PDF"
                        className="w-full h-full bg-white"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog open={!!previewImgs} onOpenChange={() => setPreviewImgs(null)}>
        <DialogContent className="sm:max-w-3xl bg-card border-border p-2">
          {previewImgs && (
            <div className="space-y-2 max-h-[80vh] overflow-auto">
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

export default Reports;
