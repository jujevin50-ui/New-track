import { useMemo, useState } from 'react';
import { LogoSwitch } from '@/components/trading/LogoSwitch';
import { HEADER_BAR, HEADER_GRID, NAV_PILL, navItemClass } from '@/components/trading/navStyles';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Check, ChevronLeft, ChevronRight, Flame, Pencil, Plus, Target, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
}

interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
}

const COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa',
  '#a78bfa', '#fb7185', '#2dd4bf', '#f97316', '#94a3b8',
];

const EMOJIS = ['🎯', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🧠', '🎸', '🧹'];

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

function computeStreak(completions: Set<string>, upTo: string): number {
  let streak = 0;
  let cur = upTo;
  // If today not done, start from yesterday so streak isn't broken mid-day
  if (!completions.has(cur)) {
    cur = addDays(cur, -1);
  }
  while (completions.has(cur)) {
    streak += 1;
    cur = addDays(cur, -1);
  }
  return streak;
}

function weekDates(anchor: Date): string[] {
  // Monday-start week containing anchor
  const d = new Date(anchor);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return todayStr(x);
  });
}

export default function Habits() {
  const { data, saveTable, addRow, updateRow, deleteRow } = useData();
  const habits = (data.habits || []) as Habit[];
  const completions = (data.habitCompletions || []) as HabitCompletion[];

  const [cursor, setCursor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState({ name: '', emoji: '🎯', color: COLORS[0] });

  const today = todayStr();
  const week = useMemo(() => weekDates(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const completionsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!map.has(c.habitId)) map.set(c.habitId, new Set());
      map.get(c.habitId)!.add(c.date);
    }
    return map;
  }, [completions]);

  const doneTodayCount = habits.filter(h => completionsByHabit.get(h.id)?.has(today)).length;
  const progress = habits.length ? Math.round((doneTodayCount / habits.length) * 100) : 0;

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', emoji: '🎯', color: COLORS[habits.length % COLORS.length] });
    setDialogOpen(true);
  };

  const openEdit = (h: Habit) => {
    setEditing(h);
    setForm({ name: h.name, emoji: h.emoji, color: h.color });
    setDialogOpen(true);
  };

  const saveHabit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Donne un nom à ton habitude');
      return;
    }
    if (editing) {
      await updateRow('habits', editing.id, { name, emoji: form.emoji, color: form.color });
      toast.success('Habitude mise à jour');
    } else {
      await addRow('habits', {
        id: crypto.randomUUID(),
        name,
        emoji: form.emoji,
        color: form.color,
        createdAt: new Date().toISOString(),
      });
      toast.success('Habitude ajoutée');
    }
    setDialogOpen(false);
  };

  const removeHabit = async (id: string) => {
    if (!confirm('Supprimer cette habitude et tout son historique ?')) return;
    const remaining = completions.filter(c => c.habitId !== id);
    await saveTable('habitCompletions', remaining);
    await deleteRow('habits', id);
    toast.success('Habitude supprimée');
  };

  const toggleDay = async (habitId: string, date: string) => {
    const existing = completions.find(c => c.habitId === habitId && c.date === date);
    if (existing) {
      await deleteRow('habitCompletions', existing.id);
    } else {
      await addRow('habitCompletions', {
        id: crypto.randomUUID(),
        habitId,
        date,
      });
    }
  };

  const prevWeek = () => {
    const d = new Date(cursor);
    d.setDate(d.getDate() - 7);
    setCursor(d);
  };
  const nextWeek = () => {
    const d = new Date(cursor);
    d.setDate(d.getDate() + 7);
    setCursor(d);
  };
  const goToday = () => setCursor(new Date());

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className={HEADER_BAR}>
        <div className={HEADER_GRID}>
          <LogoSwitch className="pointer-events-auto shrink-0" />
          <div className="flex justify-center min-w-0">
            <nav className={NAV_PILL} aria-label="Habitudes">
              <span className={navItemClass(true)}>
                <Target className="h-3.5 w-3.5 mr-1.5 inline" />
                Habitudes
              </span>
            </nav>
          </div>
          <div aria-hidden />
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 md:px-6 pt-4 flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} aria-label="Semaine précédente" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold capitalize min-w-[160px] text-center">{monthLabel}</h1>
          <button onClick={nextWeek} aria-label="Semaine suivante" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button size="sm" variant="outline" className="h-9 rounded-full px-3 text-xs" onClick={goToday}>Aujourd'hui</Button>
        </div>
        <Button size="sm" className="h-10 rounded-full gap-1.5 px-4" onClick={openNew}>
          <Plus className="h-4 w-4" />Nouvelle habitude
        </Button>
      </div>

      <main className="max-w-[1100px] mx-auto px-4 md:px-6 pb-16 pt-5 space-y-5 w-full">
        {/* Progression du jour */}
        <section className="surface p-5 rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-muted-foreground">Aujourd'hui</p>
              <p className="text-2xl font-semibold mt-0.5">
                {doneTodayCount}<span className="text-muted-foreground text-base font-normal"> / {habits.length}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className={`h-4 w-4 ${progress === 100 && habits.length ? 'text-orange-500' : ''}`} />
              {habits.length === 0
                ? 'Ajoute ta première habitude'
                : progress === 100
                  ? 'Journée impeccable 🔥'
                  : `${progress}% complété`}
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border border-dashed border-border rounded-2xl">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Aucune habitude pour l'instant</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Crée des routines simples (sport, lecture, hydratation…) et coche-les chaque jour pour rester discipliné.
              </p>
            </div>
            <Button className="rounded-full gap-1.5" onClick={openNew}>
              <Plus className="h-4 w-4" />Créer une habitude
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* En-tête jours */}
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_repeat(7,40px)_56px] gap-1.5 px-3 text-[11px] text-muted-foreground font-medium">
              <div />
              {week.map((d, i) => (
                <div key={d} className={`text-center ${d === today ? 'text-primary font-semibold' : ''}`}>
                  {dayLabels[i]}
                  <div className="tabular-nums">{Number(d.slice(8))}</div>
                </div>
              ))}
              <div className="text-center">Série</div>
            </div>

            {habits.map(habit => {
              const set = completionsByHabit.get(habit.id) || new Set<string>();
              const streak = computeStreak(set, today);
              const doneToday = set.has(today);

              return (
                <div
                  key={habit.id}
                  className="group rounded-2xl border border-border bg-card px-3 py-3 sm:py-2.5 shadow-[var(--shadow-card)]"
                >
                  <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(7,40px)_56px] gap-2 sm:gap-1.5 sm:items-center">
                    {/* Nom */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${habit.color}22` }}
                      >
                        {habit.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{habit.name}</p>
                        <p className="text-[11px] text-muted-foreground sm:hidden">
                          {doneToday ? 'Fait aujourd\'hui' : 'À faire'} · Série {streak}j
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(habit)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHabit(habit.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Cases de la semaine */}
                    <div className="flex sm:contents justify-between gap-1">
                      {week.map((d, i) => {
                        const done = set.has(d);
                        const isToday = d === today;
                        const isFuture = d > today;
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={isFuture}
                            onClick={() => toggleDay(habit.id, d)}
                            title={`${dayLabels[i]} ${d}${done ? ' — fait' : ''}`}
                            className={`h-10 w-10 sm:h-9 sm:w-9 mx-auto rounded-full flex flex-col items-center justify-center transition-all ${
                              isFuture
                                ? 'opacity-30 cursor-not-allowed'
                                : done
                                  ? 'text-white shadow-sm scale-100'
                                  : isToday
                                    ? 'border-2 border-primary/40 hover:border-primary text-muted-foreground'
                                    : 'bg-secondary/60 hover:bg-secondary text-muted-foreground'
                            }`}
                            style={done ? { backgroundColor: habit.color } : undefined}
                          >
                            <span className="sm:hidden text-[9px] leading-none mb-0.5 opacity-70">{dayLabels[i][0]}</span>
                            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Streak */}
                    <div className="hidden sm:flex items-center justify-center gap-1 text-xs font-medium tabular-nums">
                      {streak > 0 ? (
                        <>
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          <span>{streak}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l\'habitude' : 'Nouvelle habitude'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Nom</Label>
              <Input
                id="habit-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex. 30 min de sport"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`h-9 w-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      form.emoji === e ? 'bg-primary/15 ring-2 ring-primary scale-105' : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`h-8 w-8 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>
                <X className="h-4 w-4 mr-1" />Annuler
              </Button>
              <Button className="rounded-full" onClick={saveHabit}>
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
