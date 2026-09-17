import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DailyJournal, DailyEvent } from '@/hooks/useDailyJournal';
import { useEventColors } from '@/hooks/useEventColors';
import { Trade, getNetResult } from '@/types/trade';
import { Account } from '@/types/account';
import { Trash2, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  dayTrades: Trade[];
  dayPnL: number;
  existing: DailyJournal | null;
  onSave: (journal: DailyJournal) => void;
  onDelete: (date: string) => void;
  accounts?: Account[];
}

const EVENTS: { value: DailyEvent; label: string }[] = [
  { value: 'challenge_realise', label: 'Challenge Passed' },
  { value: 'challenge_echoue',  label: 'Challenge Failed' },
  { value: 'perte_compte',      label: 'Account Blown' },
];

const EXIT_COLORS: Record<string, string> = {
  TP:     'bg-[hsl(142_71%_45%/0.12)] text-profit border-[hsl(142_71%_45%/0.25)]',
  SL:     'bg-[hsl(0_84%_60%/0.12)] text-loss border-[hsl(0_84%_60%/0.25)]',
  BE:     'bg-[hsl(246_90%_63%/0.12)] text-balance border-[hsl(246_90%_63%/0.25)]',
  Manual: 'bg-secondary text-muted-foreground border-border/60',
  Trail:  'bg-[hsl(38_92%_50%/0.12)] text-drawdown border-[hsl(38_92%_50%/0.25)]',
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string) => {
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const DailyJournalDialog = ({ open, onOpenChange, date, dayTrades, dayPnL, existing, onSave, onDelete, accounts = [] }: Props) => {
  const { colors: evtColors } = useEventColors();

  const defaultDailyJournal: DailyJournal = {
    date, strategyRespected: true, mood: 'neutral', discipline: 3, confidence: 3,
    notes: '', lessonsLearned: '', mistakes: [], goals: '', event: null,
  };

  // The dialog is conditionally mounted per open (see CalendarView), so a lazy
  // initializer is enough — no resync effect needed, which also avoids
  // clobbering in-flight edits when `existing` is recomputed on every render.
  const [journal, setJournal] = useState<DailyJournal>(() => existing || { ...defaultDailyJournal, date });

  const updateJournal = <K extends keyof DailyJournal>(key: K, value: DailyJournal[K]) =>
    setJournal(prev => ({ ...prev, [key]: value }));

  const wins   = dayTrades.filter(t => getNetResult(t) > 0).length;
  const losses = dayTrades.filter(t => getNetResult(t) < 0).length;

  const handleSave = () => {
    onSave(journal);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(date);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[92vw] max-h-[85vh] flex flex-col gap-0 p-0 bg-card border-border">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDate(date)}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="day" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 shrink-0">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab: Day ── */}
          <TabsContent value="day" className="flex-1 overflow-y-auto px-6 py-5 space-y-6 mt-0">

            {/* Day summary */}
            {dayTrades.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
                <div className="flex items-center gap-2">
                  {dayPnL >= 0
                    ? <TrendingUp className="h-4 w-4 text-profit" />
                    : <TrendingDown className="h-4 w-4 text-loss" />}
                  <span className={`text-xl font-bold font-mono ${dayPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {dayPnL >= 0 ? '+' : ''}{fmt(dayPnL)}$
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {dayTrades.length} trade{dayTrades.length > 1 ? 's' : ''} · {wins}W / {losses}L
                </span>
              </div>
            )}

            {/* ── Section : Trades ── */}
            {dayTrades.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trades — {date}
                </Label>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/30">
                        {['Pair', 'Type', 'Entry', 'Exit', 'P&L', '%', 'Exit'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dayTrades.map((t, i) => {
                        const net = getNetResult(t);
                        const acc = accounts.find(a => a.id === t.accountId);
                        const pct = acc ? (t.result / acc.initialBalance) * 100 : 0;
                        const isProfit = net >= 0;
                        return (
                          <tr key={t.id} className={`border-b border-border/30 last:border-0 transition-colors hover:bg-accent/20 ${i % 2 !== 0 ? 'bg-secondary/10' : ''}`}>
                            <td className="px-3 py-2.5 font-semibold">{t.pair}</td>
                            <td className="px-3 py-2.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                t.type === 'Buy' ? 'bg-[hsl(142_71%_45%/0.12)] text-profit' : 'bg-[hsl(0_84%_60%/0.12)] text-loss'
                              }`}>
                                {t.type === 'Buy' ? 'Long' : 'Short'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">{t.date}</td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground">{t.endDate || '—'}</td>
                            <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                              {isProfit ? '+' : ''}${fmt(net)}
                            </td>
                            <td className={`px-3 py-2.5 font-mono font-semibold ${isProfit ? 'text-profit' : 'text-loss'}`}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </td>
                            <td className="px-3 py-2.5">
                              {t.endDate ? (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${EXIT_COLORS[t.exitType] || EXIT_COLORS.Manual}`}>
                                  {t.exitType}
                                </span>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dayTrades.length === 0 && (
              <p className="text-center text-sm text-muted-foreground/50 py-2">No trades on this day.</p>
            )}

            {/* ── Section : Day Event + Strategy ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">Day</p>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Event</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map(e => {
                    const c = evtColors[e.value as keyof typeof evtColors];
                    const active = journal.event === e.value;
                    return (
                      <button
                        key={e.value}
                        onClick={() => updateJournal('event', active ? null : e.value as DailyEvent)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          active ? '' : 'border-border/60 bg-secondary text-muted-foreground hover:border-border'
                        }`}
                        style={active ? {
                          borderColor: c,
                          backgroundColor: c.replace('hsl(', 'hsla(').replace(')', ', 0.12)'),
                          color: c,
                        } : undefined}
                      >
                        {e.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/50 bg-secondary/20">
                <div>
                  <p className="text-sm font-medium">Strategy Respected</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Did you follow your trading rules today?</p>
                </div>
                <Switch
                  checked={journal.strategyRespected}
                  onCheckedChange={v => updateJournal('strategyRespected', v)}
                />
              </div>
            </div>
          </TabsContent>

          {/* ── Tab: Notes ── */}
          <TabsContent value="notes" className="flex-1 overflow-y-auto px-6 py-5 mt-0">
            <Textarea
              value={journal.notes}
              onChange={e => updateJournal('notes', e.target.value)}
              placeholder="Notes du jour…"
              className="h-full min-h-[280px] text-sm resize-none"
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 shrink-0">
          {existing
            ? <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs"
                onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />Delete entry
              </Button>
            : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button size="sm" className="text-xs" onClick={handleSave}>Sauvegarder</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyJournalDialog;
