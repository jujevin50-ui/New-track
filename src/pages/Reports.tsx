import DashboardFilter from '@/components/trading/DashboardFilter';
import { accountScope } from '@/lib/accountScope';
import { localDay } from '@/lib/discipline';
import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense, type ReactNode } from 'react';
import { Account } from '@/types/account';
import { Trade, getNetResult, getTradeScreenshots } from '@/types/trade';
import { useTrades } from '@/hooks/useTrades';
import {
  PeriodReportData,
  PeriodType,
  getPeriodKey,
  getPeriodRange,
  getTradeReportDate,
  listPeriodKeys,
  usePeriodReports,
} from '@/hooks/usePeriodReports';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  CalendarDays,
  CalendarRange,
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

const ReportPdfPreview = lazy(() => import('@/components/trading/ReportPdfPreview'));

interface ReportsProps {
  activeAccount: Account | null;
  accounts: Account[];
  onSelectAccount: (id: string) => void;
}

interface PeriodEntry {
  key: string;
  label: string;
  tradeCount: number;
  hasReport: boolean;
  pnl: number;
  wins: number;
}

const reportLabel = (type: PeriodType, key: string) => {
  const range=getPeriodRange(type,key);
  if(type==='yearly') return key;
  if(type==='monthly') return range.start.toLocaleDateString('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'});
  return `${range.start.toLocaleDateString('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'})} – ${range.end.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}`;
};

const SECTION_META: Record<PeriodType, { title: string; icon: typeof CalendarDays }> = {
  weekly: { title: 'Semaine', icon: CalendarDays },
  monthly: { title: 'Mois', icon: CalendarRange },
  yearly: { title: 'Année', icon: CalendarRange },
};

const periodStorageTitle = (type: PeriodType) => (
  type === 'weekly' ? 'Rapport hebdomadaire' : type === 'monthly' ? 'Rapport mensuel' : 'Rapport annuel'
);

const formatDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

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

const Reports = ({ activeAccount, accounts, onSelectAccount }: ReportsProps) => {
  const { allTrades: rawTrades } = useTrades(activeAccount?.id || null, activeAccount?.initialBalance || 0);
  const { reports, getReport, saveReport } = usePeriodReports();

  const [preferredCurrency, setPreferredCurrency] = useState('');
  const scope = useMemo(() => accountScope(accounts, activeAccount?.id ?? 'all', preferredCurrency || (activeAccount?.id === 'all' ? accounts[0]?.currency : activeAccount?.currency)), [accounts,activeAccount?.id,activeAccount?.currency,preferredCurrency]);
  const allTrades = useMemo(() => rawTrades.filter(trade => scope.accounts.some(account => account.id === trade.accountId) && Boolean(trade.endDate) && trade.endDate!.slice(0,10) <= localDay()), [rawTrades, scope.accounts]);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedForm = useRef<PeriodReportData | null>(null);
  const formatMoney = (value: number, currency = scope.currency) => { try { return new Intl.NumberFormat('fr-FR', {style:'currency',currency,signDisplay:'exceptZero',maximumFractionDigits:2}).format(value); } catch {return value.toLocaleString('fr-FR',{signDisplay:'exceptZero',maximumFractionDigits:2});} };
  const pdfMoney = useCallback((value: number, currency = scope.currency) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} ${currency}`, [scope.currency]);
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
  const reportContext = `${selected?.type}/${selected?.key}/${activeAccount?.id}/${scope.currency}`;
  const loadedContext = useRef('');

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
        label: reportLabel(type, key),
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
    if (!selected || dirty) return;
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
    const loaded = {
      emotionGenerale: next.emotionGenerale,
      tradesEmotionnels: next.tradesEmotionnels,
      tradeNotes,
      conclusion: next.conclusion,
      objectifPrincipal: next.objectifPrincipal,
      objectifsSecondaires: next.objectifsSecondaires,
      pointsPsychologiques: next.pointsPsychologiques,
      solutions: next.solutions,
    };
    loadedForm.current = loaded;
    loadedContext.current = reportContext;
    setFormData(loaded);
  }, [selected, getReport, allTrades, reports, dirty, reportContext]);

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
    const losses = selectedTrades.filter(t => getNetResult(t) < 0).length;
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

  const updateField = <K extends keyof PeriodReportData>(field: K, value: PeriodReportData[K]) => { setDirty(true); setFormData(prev => ({ ...prev, [field]: value })); };

  const updateTradeNote = (tradeId: string, note: string) => { setDirty(true); setFormData(prev => ({ ...prev, tradeNotes: { ...prev.tradeNotes, [tradeId]: note } })); };

  const selectPeriod = (type: PeriodType, key: string) => {
    if (saving || dirty && !window.confirm('Changer de rapport sans enregistrer les modifications ?')) return false;
    setDirty(false);
    setSelected({ type, key });
    setIsEditing(false);
    setBrowseType(type);
    return true;
  };

  const createCurrent = (type: PeriodType) => {
    const key = getPeriodKey(type, new Date());
    if (selectPeriod(type, key)) setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    if (saving) return;
    setSaving(true);
    try { await saveReport(selected.type, selected.key, formData); loadedForm.current = formData; setDirty(false); toast.success('Rapport enregistré'); setIsEditing(false); } catch { toast.error('Impossible d’enregistrer le rapport.'); } finally { setSaving(false); }
  };

  const handleDownloadPDF = useCallback(async (mode: 'download' | 'preview' = 'download'): Promise<string | undefined> => {
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
      ['RESULTAT NET', pdfMoney(stats.pnl)],
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
    pdf.text(`1 - Synthèse de la période`, margin, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    for (const line of [
      `Trades gagnants: ${stats.wins}`,
      `Trades perdants: ${stats.losses}`,
    ]) {
      checkPage(6);
      pdf.text(line, margin + 4, y);
      y += 6;
    }
    y += 4;

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('2 - Analyse des trades', margin, y);
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
      pdf.text(`Paire: ${trade.pair}  ${pdfMoney(net,accounts.find(account=>account.id===trade.accountId)?.currency)}`, margin + 8, y);
      y += 5;
      pdf.text(`Strategie respectee: ${trade.strategyRespected ? 'oui' : 'non'}`, margin + 8, y);
      y += 5;

      const note = formData.tradeNotes[trade.id] ?? trade.notes;
      if (note) {
        const noteLines = pdf.splitTextToSize(`Note: ${note}`, contentW - 12);
        checkPage(noteLines.length * 5);
        for (const line of noteLines) { checkPage(5); pdf.text(line, margin + 8, y); y += 5; }
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
      pdf.text('Aucun trade clôturé sur cette période.', margin + 4, y);
      y += 8;
    }

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    checkPage(20);
    pdf.text('3 - Bilan de la période', margin, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const reflection = pdf.splitTextToSize(formData.conclusion || '(Not specified)', contentW - 8);
    for (const line of reflection) { checkPage(5); pdf.text(line, margin + 4, y); y += 5; }
    y += 8;

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    checkPage(20);
    pdf.text('4 - Objectifs', margin, y);
    y += 8;
    pdf.setFontSize(10);
    for (const field of [
      ['Objectif principal', formData.objectifPrincipal],
      ['Objectifs secondaires', formData.objectifsSecondaires],
    ] as [string, string][]) {
      checkPage(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${field[0]}:`, margin + 4, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(field[1] || '(Not specified)', contentW - 12);
      for (const line of lines) { checkPage(5); pdf.text(line, margin + 8, y); y += 5; }
      y += 4;
    }

    if (mode === 'preview') return pdf.output('datauristring').split(',')[1];

    pdf.save(`${selected.type}-report-${selected.key}.pdf`);
    toast.success('PDF téléchargé');
    return undefined;
  }, [selected, stats, selectedTrades, formData, accounts, pdfMoney]);

  const generatePreview = useCallback(() => handleDownloadPDF('preview'), [handleDownloadPDF]);

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Aucun compte sélectionné.</p>
      </div>
    );
  }

  const currentMeta = selected ? SECTION_META[selected.type] : SECTION_META.weekly;
  const selectedSaved = selected ? !!reports[selected.type][selected.key] : false;
  const selectedEntry = selected
    ? reportEntries[selected.type].find(e => e.key === selected.key)
    : undefined;

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visibleEntries = reportEntries[browseType].filter(entry => (visibility === 'all' || (visibility === 'saved' ? entry.hasReport : !entry.hasReport)) && normalize(`${entry.label} ${entry.key}`).includes(normalize(query)));
  return (
    <div className="reports-page w-full space-y-8 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
      <div className="dashboard-filter-controls"><DashboardFilter label="Compte" ariaLabel="Compte des rapports" value={activeAccount?.id ?? 'all'} onChange={id => {if (!dirty || window.confirm('Changer de compte sans enregistrer les modifications ?')) {setDirty(false); setIsEditing(false); onSelectAccount(id);}}} options={[{value:'all',label:'Tous les comptes'},...accounts.map(account => ({value:account.id,label:account.name}))]}/>{scope.groups.length>1 && <DashboardFilter label="Devise" ariaLabel="Devise des rapports" value={scope.currency || 'UNKNOWN'} onChange={value => {if (!dirty || window.confirm('Changer de devise sans enregistrer les modifications ?')) {setDirty(false); setIsEditing(false); setPreferredCurrency(value);}}} options={scope.groups.map(group=>({value:group.currency,label:group.currency}))}/>}</div>
      <div className="reports-layout grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="reports-browser min-w-0 space-y-4" aria-label="Liste des rapports">
          <div role="group" aria-label="Périodicité des rapports" className="dashboard-switch reports-period-switch">{(['weekly','monthly','yearly'] as PeriodType[]).map(type => <button key={type} type="button" aria-pressed={browseType===type} onClick={()=>{const first=reportEntries[type][0]; if(first && selectPeriod(type,first.key)) setQuery('');}}>{type==='weekly' ? 'Semaines' : type==='monthly' ? 'Mois' : 'Années'}</button>)}</div>
          <Input type="search" aria-label="Rechercher un rapport" placeholder="Rechercher une période…" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 rounded-[10px] bg-transparent text-xs"/>
          <DashboardFilter label="Afficher" ariaLabel="État des rapports" value={visibility} onChange={setVisibility} options={[{value:'all',label:'Toutes les périodes'},{value:'saved',label:'Enregistrés'},{value:'draft',label:'À rédiger'}]}/>
          <Button variant="outline" className="h-10 w-full rounded-[10px] text-xs" disabled={saving} onClick={()=>createCurrent(browseType)}>Nouveau rapport</Button>
          <nav className="reports-period-list" aria-label="Périodes disponibles">{visibleEntries.length ? visibleEntries.map(entry=><button key={entry.key} type="button" aria-label={`Ouvrir le rapport ${entry.label}`} aria-pressed={selected?.type===browseType && selected.key===entry.key} onClick={()=>selectPeriod(browseType,entry.key)} className="reports-period-item"><span className="block text-xs font-medium capitalize">{entry.label}</span><span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground"><span className={entry.hasReport ? 'text-primary' : ''}>{entry.hasReport ? 'Enregistré' : 'À rédiger'}</span><span>{entry.tradeCount} trade{entry.tradeCount>1 ? 's' : ''}</span></span></button>) : <p className="py-8 text-center text-xs text-muted-foreground">Aucune période trouvée.</p>}</nav>
        </aside>
        <div className="min-w-0">
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
                    {selectedSaved && !dirty && <span className="text-[9px] px-1.5 py-0.5 rounded bg-profit/10 text-profit">Enregistré</span>}
                    {(!selectedSaved || dirty) && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{dirty ? 'Modifications non enregistrées' : 'Brouillon'}</span>}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{selectedEntry?.label || reportLabel(selected.type, selected.key)}</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{activeAccount.id === 'all' ? `Tous les comptes${scope.currency ? ` · ${scope.currency}` : ''}` : activeAccount.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 max-w-full">
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
                      <Button variant="outline" size="sm" disabled={saving} onClick={() => { if(loadedForm.current) setFormData(loadedForm.current); setDirty(false); setIsEditing(false); }} className="gap-1.5 text-xs">
                        Annuler
                      </Button>
                      <Button size="sm" disabled={saving} onClick={handleSave} className="gap-1.5 text-xs">
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
                    { label: 'P&L', value: formatMoney(stats.pnl), color: stats.pnl >= 0 ? 'text-profit' : 'text-loss' },
                    { label: 'Trades', value: String(stats.total), color: 'text-foreground' },
                    { label: 'Win rate', value: stats.total ? `${stats.winRate} %` : '—', color: stats.winRate >= 50 ? 'text-profit' : 'text-loss' },
                    { label: 'Stratégie respectée', value: stats.total ? `${stats.strategy} %` : '—', color: stats.strategy >= 70 ? 'text-profit' : 'text-loss' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-border/60 bg-background/30 p-4">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
                      <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ['Profit Factor', !stats.total ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})],
                    ['Gain moyen', formatMoney(stats.avgWin)],
                    ['Perte moyenne', formatMoney(stats.avgLoss)],
                    ['Meilleur / pire', `${formatMoney(stats.best)} / ${formatMoney(stats.worst)}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border/50 px-3 py-3">
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold font-mono mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-7 max-w-3xl">
                  <Question n={1} q="Bilan de la période">
                    <Textarea
                      aria-label="Bilan de la période" placeholder="Ton bilan…"
                      className="h-28 text-sm resize-none bg-secondary border-border"
                      value={formData.conclusion}
                      onChange={e => updateField('conclusion', e.target.value)}
                    />
                  </Question>

                  <Question n={2} q="Objectif principal">
                    <Textarea
                      aria-label="Objectif principal" placeholder="Ton objectif…"
                      className="h-20 text-sm resize-none bg-secondary border-border"
                      value={formData.objectifPrincipal}
                      onChange={e => updateField('objectifPrincipal', e.target.value)}
                    />
                  </Question>

                  <Question n={3} q="Objectifs secondaires">
                    <Textarea
                      aria-label="Objectifs secondaires" placeholder="Tes objectifs secondaires…"
                      className="h-20 text-sm resize-none bg-secondary border-border"
                      value={formData.objectifsSecondaires}
                      onChange={e => updateField('objectifsSecondaires', e.target.value)}
                    />
                  </Question>

                </div>

                <div className="rounded-2xl border border-border/60 bg-background/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Trades et notes</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{selectedTrades.length} total</span>
                  </div>

                  {selectedTrades.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">Aucun trade clôturé sur cette période.</div>
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
                                {formatMoney(net,accounts.find(account=>account.id===trade.accountId)?.currency)}
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
                                aria-label={`Note du trade ${trade.tradeNumber}`} placeholder="Analyse du trade…"
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
                  <Button disabled={saving} onClick={handleSave} className="gap-1.5 text-xs">
                    <Save className="h-3.5 w-3.5" />Enregistrer le rapport
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" />Voir PDF
                  </Button>
                </div>
              </div>
              ) : (
                <div className="report-pdf-preview">
                  {loadedContext.current !== reportContext ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">Préparation du rapport…</p> : <Suspense fallback={<p role="status" className="py-12 text-center text-sm text-muted-foreground">Ouverture du PDF…</p>}><ReportPdfPreview generate={generatePreview} label={`Rapport PDF · ${reportLabel(selected.type, selected.key)}`}/></Suspense>}
                </div>
              )}
            </>
          )}
        </section>
      </div>
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
