import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { Account } from '@/types/account';
import { Trade, getNetResult, getTradeScreenshots } from '@/types/trade';
import { useTrades } from '@/hooks/useTrades';
import {
  PeriodReportData,
  PeriodType,
  getPeriodKey,
  getPeriodLabel,
  getPeriodRange,
  getTradeReportDate,
  listPeriodKeys,
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
  weekly: { title: 'Semaine', icon: CalendarDays },
  monthly: { title: 'Mois', icon: CalendarRange },
  yearly: { title: 'Année', icon: CalendarRange },
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

  const [browseType, setBrowseType] = useState<PeriodType>('weekly');
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

  const buildEntries = useCallback((type: PeriodType): PeriodEntry[] => {
    const keys = new Set<string>(Object.keys(reports[type]));

    // Une période existe même sans trade : on génère toutes les périodes depuis la plus ancienne
    // activité (1er trade ou compte rendu enregistré) jusqu'à aujourd'hui.
    const now = new Date();
    let earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    for (const trade of allTrades) {
      const d = new Date(getTradeReportDate(trade));
      if (!Number.isNaN(d.getTime()) && d < earliest) earliest = d;
    }
    for (const key of Object.keys(reports[type])) {
      const start = getPeriodRange(type, key).start;
      if (!Number.isNaN(start.getTime()) && start < earliest) earliest = start;
    }
    for (const key of listPeriodKeys(type, earliest, now)) keys.add(key);

    return [...keys].map(key => {
      // Un trade est rangé dans la période de sa DATE DE FIN
      const range = getPeriodRange(type, key);
      const start = range.start.toISOString().slice(0, 10);
      const end = range.end.toISOString().slice(0, 10);
      const tradesInPeriod = allTrades.filter(t => { const d = getTradeReportDate(t); return d >= start && d <= end; });
      return {
        key,
        label: getPeriodLabel(type, key),
        tradeCount: tradesInPeriod.length,
        hasReport: !!reports[type][key],
        pnl: tradesInPeriod.reduce((sum, t) => sum + getNetResult(t), 0),
        wins: tradesInPeriod.filter(t => getNetResult(t) > 0).length,
      };
    }).sort((a, b) => b.key.localeCompare(a.key));
  }, [allTrades, reports]);

  const reportEntries = useMemo<Record<PeriodType, PeriodEntry[]>>(() => ({
    weekly: buildEntries('weekly'),
    monthly: buildEntries('monthly'),
    yearly: buildEntries('yearly'),
  }), [buildEntries]);

  useEffect(() => {
    if (selected) return;
    const first = reportEntries[browseType][0];
    if (first) setSelected({ type: browseType, key: first.key });
  }, [reportEntries, selected, browseType]);

  useEffect(() => {
    if (!selected) return;
    const next = getReport(selected.type, selected.key);
    // Un trade peut avoir changé de semaine (rangé par date de fin) : on retrouve ses notes saisies
    // dans un autre compte rendu de même type, sans écraser ce qui est déjà noté ici.
    let tradeNotes: Record<string, string> = next.tradeNotes || {};
    {
      const range = getPeriodRange(selected.type, selected.key);
      const start = range.start.toISOString().slice(0, 10);
      const end = range.end.toISOString().slice(0, 10);
      const ids = new Set(allTrades.filter(t => { const d = getTradeReportDate(t); return d >= start && d <= end; }).map(t => t.id));
      const inherited: Record<string, string> = {};
      for (const [key, rep] of Object.entries(reports[selected.type])) {
        if (key === selected.key) continue;
        for (const [id, note] of Object.entries(rep.tradeNotes || {})) {
          if (ids.has(id) && note && !inherited[id]) inherited[id] = note;
        }
      }
      tradeNotes = { ...inherited, ...tradeNotes };
    }
    setFormData({
      emotionGenerale: next.emotionGenerale,
      tradesEmotionnels: next.tradesEmotionnels,
      tradeNotes,
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
      .filter(t => { const d = getTradeReportDate(t); return d >= start && d <= end; })
      .sort((a, b) => getTradeReportDate(a).localeCompare(getTradeReportDate(b)) || (a.tradeNumber || 0) - (b.tradeNumber || 0));
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
    setBrowseType(type);
  };

  const createCurrent = (type: PeriodType) => {
    const key = getPeriodKey(type, new Date());
    selectPeriod(type, key);
    setIsEditing(true);
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
    <div className="w-full max-w-[1040px] mx-auto pb-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rapports</h1>
        <div role="group" aria-label="Périodicité des rapports" className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card p-1">
          {(['weekly', 'monthly', 'yearly'] as PeriodType[]).map(type => {
            const Icon = SECTION_META[type].icon;
            return <button key={type} type="button" aria-pressed={browseType === type} onClick={() => {
              setBrowseType(type);
              const first = reportEntries[type][0];
              if (first) selectPeriod(type, first.key);
              else { setSelected(null); setIsEditing(false); }
            }} className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 sm:px-4 text-sm transition-colors ${browseType === type ? 'selected-tab font-semibold' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="h-3.5 w-3.5" />{SECTION_META[type].title}</button>;
          })}
        </div>
      </div>
      <div className="mx-auto mb-6 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <Select value={selected?.type === browseType ? selected.key : ''} onValueChange={key => selectPeriod(browseType, key)}>
          <SelectTrigger aria-label="Période" className="h-10 w-full sm:w-[280px] rounded-xl bg-card border-border/60"><SelectValue placeholder="Choisir une période" /></SelectTrigger>
          <SelectContent>{reportEntries[browseType].map(entry => <SelectItem key={entry.key} value={entry.key}>{entry.label}{entry.hasReport ? ' · Enregistré' : ''}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => createCurrent(browseType)} className="rounded-xl" variant="outline">+ Nouveau rapport</Button>
      </div>
      <div className="mx-auto max-w-[900px]">
        {/* Right detail */}
        <section className="report-paper min-w-0 rounded-xl border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
          {!selected ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
              <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Sélectionnez une période</p>
            </div>
          ) : (
            <>
              <div className="px-6 pt-8 pb-6 sm:px-12 sm:pt-12 border-b border-border/50 flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <currentMeta.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{currentMeta.title}</span>
                    {selectedSaved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-profit/10 text-profit">Enregistré</span>}
                    {!selectedSaved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Brouillon</span>}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{selectedEntry?.label || getPeriodLabel(selected.type, selected.key)}</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{activeAccount.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                  {!isEditing ? (
                    <>
                      <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs">
                        <Edit3 className="h-3.5 w-3.5" />Modifier
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF('view')} className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />Voir PDF</Button>
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
              <div className="p-6 sm:p-12 space-y-10">
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
                              <span className="text-[10px] text-muted-foreground ml-auto">{trade.endDate && trade.endDate.slice(0, 10) !== trade.date.slice(0, 10) ? `${trade.date.slice(0, 10)} → ${trade.endDate.slice(0, 10)}` : trade.date.slice(0, 10)}</span>
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
                <div className="px-6 py-8 sm:px-12 sm:py-10">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-7 border-b border-border/60 pb-8 sm:grid-cols-4">
                    {[
                      { label: 'Résultat net', value: `${fmt(stats.pnl)}$`, color: stats.pnl >= 0 ? 'text-profit' : 'text-loss' },
                      { label: 'Trades', value: String(stats.total), color: 'text-foreground' },
                      { label: 'Win rate', value: `${stats.winRate}%`, color: 'text-foreground' },
                      { label: 'Plan respecté', value: `${stats.strategy}%`, color: 'text-foreground' },
                    ].map(item => <div key={item.label} className="min-w-0"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className={`mt-2 break-words font-mono text-xl sm:text-2xl font-semibold tracking-tight ${item.color}`}>{item.value}</dd></div>)}
                  </dl>
                  <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
                    <span>Profit factor <strong className="ml-2 font-mono font-medium text-foreground">{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</strong></span>
                    {formData.emotionGenerale && <span>État d’esprit <strong className="ml-2 font-medium text-foreground">{formData.emotionGenerale}</strong></span>}
                    <span>Trades émotionnels <strong className="ml-2 font-mono font-medium text-foreground">{formData.tradesEmotionnels}</strong></span>
                  </div>
                  <div className="my-12 space-y-12 sm:my-14 sm:space-y-14">
                    <article><h3 className="mb-4 text-lg font-semibold">Bilan de la période</h3><p className="report-reading text-[15px] text-foreground/80">{formData.conclusion || '—'}</p></article>
                    <article><h3 className="mb-4 text-lg font-semibold">Objectifs</h3><p className="report-reading text-[15px] text-foreground/80">{formData.objectifPrincipal || '—'}</p>{formData.objectifsSecondaires && <p className="report-reading mt-5 text-[15px] text-muted-foreground">{formData.objectifsSecondaires}</p>}</article>
                    <article><h3 className="mb-4 text-lg font-semibold">Psychologie</h3><p className="report-reading text-[15px] text-foreground/80">{formData.pointsPsychologiques || '—'}</p></article>
                    <article><h3 className="mb-4 text-lg font-semibold">Plan d’action</h3><p className="report-reading text-[15px] text-foreground/80">{formData.solutions || '—'}</p></article>
                  </div>
                  {selectedTrades.length > 0 && <section className="border-t border-border/60 pt-6"><h3 className="mb-3 text-base font-semibold">Trades de la période</h3><div className="divide-y divide-border/50">{selectedTrades.map(trade => <div key={trade.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{trade.pair} <span className="ml-2 text-xs text-muted-foreground">{trade.type === 'Buy' ? 'Long' : 'Short'} · {getTradeReportDate(trade)}</span></span><span className={`font-mono text-sm font-semibold ${getNetResult(trade) >= 0 ? 'text-profit' : 'text-loss'}`}>{fmt(getNetResult(trade))}$</span></div>{(formData.tradeNotes[trade.id] ?? trade.notes) && <p className="report-reading mt-2 text-sm text-muted-foreground">{formData.tradeNotes[trade.id] ?? trade.notes}</p>}{getTradeScreenshots(trade).length > 0 && <button onClick={() => setPreviewImgs(getTradeScreenshots(trade))} className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary"><Image className="h-3.5 w-3.5" />Captures</button>}</div>)}</div></section>}
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
