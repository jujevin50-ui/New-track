import { useMemo, useState } from 'react';
import { Account } from '@/types/account';
import { getNetResult } from '@/types/trade';
import { useTrades } from '@/hooks/useTrades';
import { DailyJournal, useDailyJournal } from '@/hooks/useDailyJournal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Check, X, Save, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface DailyReportProps {
  activeAccount: Account | null;
  accounts: Account[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });

const pct = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

const emptyJournal = (date: string): DailyJournal => ({
  date,
  strategyRespected: false,
  mood: 'neutral',
  discipline: 0,
  confidence: 0,
  notes: '',
  lessonsLearned: '',
  mistakes: [],
  goals: '',
  event: null,
});

const DailyReport = ({ activeAccount }: DailyReportProps) => {
  const { trades } = useTrades(activeAccount?.id || null, activeAccount?.initialBalance || 0);
  const { getJournal, saveJournal } = useDailyJournal();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<DailyJournal | null>(null);
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyStats = useMemo(() => {
    const map: Record<string, { pnl: number; pct: number }> = {};
    const balance = activeAccount?.initialBalance || 0;

    trades.forEach(trade => {
      const date = (trade.endDate || trade.date || '').slice(0, 10);
      if (!date) return;
      if (!map[date]) map[date] = { pnl: 0, pct: 0 };
      const net = getNetResult(trade);
      map[date].pnl += net;
      map[date].pct += balance ? (net / balance) * 100 : 0;
    });

    return map;
  }, [trades, activeAccount?.initialBalance]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = dateKey(year, month, day);
      const journal = getJournal(date);
      const stats = dailyStats[date] || { pnl: 0, pct: 0 };
      return { day, date, journal, stats };
    });
  }, [year, month, daysInMonth, getJournal, dailyStats]);

  const openDay = (date: string) => {
    const existing = getJournal(date);
    setSelectedDate(date);
    setDraft(existing ? { ...existing, mistakes: [...(existing.mistakes || [])] } : emptyJournal(date));
  };

  const closeDay = () => {
    setSelectedDate(null);
    setDraft(null);
  };

  const updateDraft = (updates: Partial<DailyJournal>) => {
    setDraft(prev => prev ? { ...prev, ...updates } : prev);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveJournal(draft);
      toast.success('Bilan journalier enregistré');
      closeDay();
    } catch (error: any) {
      toast.error(error?.message || 'Impossible d’enregistrer le bilan');
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = (delta: number) => {
    setSelectedDate(null);
    setDraft(null);
    setCurrentDate(new Date(year, month + delta, 1));
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground text-sm">No account selected.</p>
      </div>
    );
  }

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-page-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Journal</p>
          <h1 className="text-2xl font-bold tracking-tight">Bilan journalier</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivi quotidien de ta stratégie, de ta discipline et de ton résultat.</p>
        </div>
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/20">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold">{MONTHS[month]} {year}</div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-[70px_150px_170px_1fr_120px] gap-3 px-4 py-2.5 border-b border-border/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Jour</span>
          <span>Date</span>
          <span>Stratégie</span>
          <span>Note</span>
          <span className="text-right">Résultat</span>
        </div>

        <div className="divide-y divide-border/40">
          {days.map(({ day, date, journal, stats }) => {
            const isSelected = selectedDate === date;
            const isToday = date === todayKey;
            const isGood = journal?.productive === true;
            const strategy = journal?.strategyRespected;

            return (
              <div key={date} className={isGood ? 'bg-emerald-500/[0.08]' : ''}>
                <button
                  type="button"
                  onClick={() => openDay(date)}
                  className={`w-full grid grid-cols-[70px_150px_170px_1fr_120px] gap-3 items-center px-4 py-3 text-left transition-colors hover:bg-secondary/40 ${isSelected ? 'bg-primary/[0.06]' : ''}`}
                >
                  <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>{String(day).padStart(2, '0')}</span>
                  <span className="text-xs text-muted-foreground capitalize">{shortDate(date)}</span>
                  <span className="flex items-center gap-2">
                    {strategy === true ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400"><Check className="h-3.5 w-3.5" /> Respectée</span>
                    ) : strategy === false ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-red-400"><X className="h-3.5 w-3.5" /> Non</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {journal?.notes ? journal.notes : <span className="text-muted-foreground/30">Aucune note</span>}
                  </span>
                  <span className={`text-right text-xs font-medium tabular-nums ${stats.pct > 0 ? 'text-emerald-400' : stats.pct < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {pct(stats.pct)}
                  </span>
                </button>

                {isSelected && draft && (
                  <div className="px-5 pb-5 pt-1 border-t border-border/40 bg-background/40">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 pt-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">Note de la journée</label>
                          <Textarea
                            value={draft.notes}
                            onChange={e => updateDraft({ notes: e.target.value })}
                            placeholder="Comment s'est passée ta journée ? Émotions, erreurs, décisions, contexte..."
                            className="mt-1.5 min-h-[120px] resize-y bg-card"
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Résultat du jour : <span className={stats.pct >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{pct(stats.pct)}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Respect de la stratégie</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateDraft({ strategyRespected: true })}
                              className={`h-9 rounded-lg border text-xs font-medium transition-colors ${draft.strategyRespected ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                            >
                              ✓ Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDraft({ strategyRespected: false })}
                              className={`h-9 rounded-lg border text-xs font-medium transition-colors ${!draft.strategyRespected ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                            >
                              ✕ Non
                            </button>
                          </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-3 cursor-pointer hover:bg-secondary/40 transition-colors">
                          <Checkbox
                            checked={draft.productive === true}
                            onCheckedChange={checked => updateDraft({ productive: checked === true })}
                          />
                          <span>
                            <span className="block text-xs font-semibold">Journée productive & bonne</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">Une journée que tu considères réussie.</span>
                          </span>
                        </label>

                        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                          <Save className="h-3.5 w-3.5" />
                          {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyReport;
