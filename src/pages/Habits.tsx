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
  CalendarDays, BarChart3, LayoutGrid, ArrowUpDown, Trophy, Percent,
} from 'lucide-react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { toast } from 'sonner';

/* ───────────────── Types ───────────────── */

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
  /** Jours de la semaine attendus : 0=Lun … 6=Dim. Vide ou [0..6] = tous les jours. */
  daysOfWeek?: number[];
  archived?: boolean;
}

interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
}

type ViewTab = 'today' | 'week' | 'heatmap' | 'stats';
type SortKey = 'name' | 'streak' | 'rate' | 'created';

/* ───────────────── Constants ───────────────── */

const COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa',
  '#a78bfa', '#fb7185', '#2dd4bf', '#f97316', '#94a3b8',
];

const EMOJIS = ['🎯', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🧠', '🎸', '🧹', '☀️', '🚫', '💊', '🛏️'];

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const VIEW_TABS: { id: ViewTab; label: string; Icon: typeof Target }[] = [
  { id: 'today', label: "Aujourd'hui", Icon: Check },
  { id: 'week', label: 'Semaine', Icon: CalendarDays },
  { id: 'heatmap', label: 'Heatmap', Icon: LayoutGrid },
  { id: 'stats', label: 'Stats', Icon: BarChart3 },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'streak', label: 'Série' },
  { key: 'rate', label: 'Réussite' },
  { key: 'name', label: 'Nom' },
  { key: 'created', label: 'Création' },
];

/* ───────────────── Date helpers ───────────────── */

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

/** 0 = Lundi … 6 = Dimanche */
function weekdayIndex(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  return (d.getDay() + 6) % 7;
}

function isScheduled(habit: Habit, dateStr: string): boolean {
  const days = habit.daysOfWeek;
  if (!days || days.length === 0 || days.length === 7) return true;
  return days.includes(weekdayIndex(dateStr));
}

function weekDates(anchor: Date): string[] {
  const d = new Date(anchor);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return todayStr(x);
  });
}

/** Liste des N derniers jours jusqu'à `end` inclus */
function lastNDays(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
}

function computeStreak(completions: Set<string>, habit: Habit, upTo: string): number {
  let streak = 0;
  let cur = upTo;
  // Si aujourd'hui n'est pas un jour prévu ou pas encore coché, on part d'hier
  if (!isScheduled(habit, cur) || !completions.has(cur)) {
    cur = addDays(cur, -1);
  }
  // Remonter en sautant les jours non planifiés
  let guard = 0;
  while (guard++ < 400) {
    if (isScheduled(habit, cur)) {
      if (!completions.has(cur)) break;
      streak += 1;
    }
    cur = addDays(cur, -1);
  }
  return streak;
}

function computeRate(completions: Set<string>, habit: Habit, from: string, to: string): { done: number; expected: number; rate: number } {
  let done = 0;
  let expected = 0;
  let cur = from;
  while (cur <= to) {
    if (isScheduled(habit, cur) && cur >= (habit.createdAt?.slice(0, 10) || from)) {
      expected += 1;
      if (completions.has(cur)) done += 1;
    }
    cur = addDays(cur, 1);
  }
  return { done, expected, rate: expected ? Math.round((done / expected) * 100) : 0 };
}

/* ───────────────── Heatmap helpers ───────────────── */

/** 16 semaines (≈ 112 jours) terminant le dimanche de la semaine de `anchor` */
function heatmapGrid(anchor: Date): { dates: string[]; weeks: string[][]; monthLabels: { weekIndex: number; label: string }[] } {
  const week = weekDates(anchor);
  const end = week[6]; // dimanche de la semaine courante
  const start = addDays(end, -(16 * 7 - 1));
  const dates = lastNDays(end, 16 * 7);
  const weeks: string[][] = [];
  for (let i = 0; i < 16; i++) weeks.push(dates.slice(i * 7, i * 7 + 7));

  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const d = new Date(w[0] + 'T12:00:00');
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        weekIndex: wi,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      });
      lastMonth = m;
    }
  });

  return { dates, weeks, monthLabels };
}

/* ───────────────── Component ───────────────── */

export default function Habits() {
  const { data, saveTable, addRow, updateRow, deleteRow } = useData();
  const allHabits = (data.habits || []) as Habit[];
  const habits = allHabits.filter(h => !h.archived);
  const completions = (data.habitCompletions || []) as HabitCompletion[];

  const [view, setView] = useState<ViewTab>('today');
  const [cursor, setCursor] = useState(() => new Date());
  const [sortKey, setSortKey] = useState<SortKey>('streak');
  const [heatmapHabitId, setHeatmapHabitId] = useState<string | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState({
    name: '',
    emoji: '🎯',
    color: COLORS[0],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as number[],
  });

  const today = todayStr();
  const week = useMemo(() => weekDates(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const rangeFrom = addDays(today, -89); // 90 jours pour stats

  const completionsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!map.has(c.habitId)) map.set(c.habitId, new Set());
      map.get(c.habitId)!.add(c.date);
    }
    return map;
  }, [completions]);

  /* Stats par habitude */
  const habitStats = useMemo(() => {
    return habits.map(h => {
      const set = completionsByHabit.get(h.id) || new Set<string>();
      const streak = computeStreak(set, h, today);
      const { done, expected, rate } = computeRate(set, h, rangeFrom, today);
      const scheduledToday = isScheduled(h, today);
      const doneToday = set.has(today);
      return { habit: h, set, streak, done, expected, rate, scheduledToday, doneToday };
    });
  }, [habits, completionsByHabit, today, rangeFrom]);

  const sortedStats = useMemo(() => {
    const list = [...habitStats];
    list.sort((a, b) => {
      if (sortKey === 'name') return a.habit.name.localeCompare(b.habit.name, 'fr');
      if (sortKey === 'streak') return b.streak - a.streak || a.habit.name.localeCompare(b.habit.name, 'fr');
      if (sortKey === 'rate') return b.rate - a.rate || b.streak - a.streak;
      // created
      return (b.habit.createdAt || '').localeCompare(a.habit.createdAt || '');
    });
    return list;
  }, [habitStats, sortKey]);

  const dueToday = habitStats.filter(s => s.scheduledToday);
  const doneTodayCount = dueToday.filter(s => s.doneToday).length;
  const progress = dueToday.length ? Math.round((doneTodayCount / dueToday.length) * 100) : 0;

  /* Heatmap data */
  const heat = useMemo(() => heatmapGrid(new Date()), []);
  const heatValues = useMemo(() => {
    const map = new Map<string, number>(); // date -> 0..1 intensity
    if (heatmapHabitId === 'all') {
      for (const d of heat.dates) {
        const due = habits.filter(h => isScheduled(h, d) && d >= (h.createdAt?.slice(0, 10) || d));
        if (!due.length) { map.set(d, -1); continue; } // -1 = aucun prévu
        const done = due.filter(h => completionsByHabit.get(h.id)?.has(d)).length;
        map.set(d, done / due.length);
      }
    } else {
      const h = habits.find(x => x.id === heatmapHabitId);
      if (!h) return map;
      const set = completionsByHabit.get(h.id) || new Set();
      for (const d of heat.dates) {
        if (!isScheduled(h, d) || d < (h.createdAt?.slice(0, 10) || d)) {
          map.set(d, -1);
          continue;
        }
        map.set(d, set.has(d) ? 1 : 0);
      }
    }
    return map;
  }, [heat.dates, habits, completionsByHabit, heatmapHabitId]);

  /* Chart data — taux global par jour sur 30j */
  const trendData = useMemo(() => {
    const days = lastNDays(today, 30);
    return days.map(d => {
      const due = habits.filter(h => isScheduled(h, d) && d >= (h.createdAt?.slice(0, 10) || d));
      const done = due.filter(h => completionsByHabit.get(h.id)?.has(d)).length;
      const rate = due.length ? Math.round((done / due.length) * 100) : null;
      return {
        day: d.slice(5), // MM-DD
        full: d,
        rate,
        done,
        due: due.length,
      };
    });
  }, [habits, completionsByHabit, today]);

  /* Bar chart — réussite par habitude */
  const rateBars = useMemo(() => {
    return [...habitStats]
      .sort((a, b) => b.rate - a.rate)
      .map(s => ({
        name: `${s.habit.emoji} ${s.habit.name}`,
        rate: s.rate,
        color: s.habit.color,
        done: s.done,
        expected: s.expected,
      }));
  }, [habitStats]);

  /* ── CRUD ── */

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      emoji: '🎯',
      color: COLORS[habits.length % COLORS.length],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    });
    setDialogOpen(true);
  };

  const openEdit = (h: Habit) => {
    setEditing(h);
    setForm({
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      daysOfWeek: h.daysOfWeek?.length ? [...h.daysOfWeek] : [0, 1, 2, 3, 4, 5, 6],
    });
    setDialogOpen(true);
  };

  const toggleFormDay = (day: number) => {
    setForm(f => {
      const has = f.daysOfWeek.includes(day);
      let next = has ? f.daysOfWeek.filter(d => d !== day) : [...f.daysOfWeek, day].sort((a, b) => a - b);
      if (next.length === 0) next = [day]; // au moins 1 jour
      return { ...f, daysOfWeek: next };
    });
  };

  const setFormPreset = (preset: 'daily' | 'weekdays' | 'weekend') => {
    if (preset === 'daily') setForm(f => ({ ...f, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }));
    if (preset === 'weekdays') setForm(f => ({ ...f, daysOfWeek: [0, 1, 2, 3, 4] }));
    if (preset === 'weekend') setForm(f => ({ ...f, daysOfWeek: [5, 6] }));
  };

  const saveHabit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Donne un nom à ton habitude');
      return;
    }
    const payload = {
      name,
      emoji: form.emoji,
      color: form.color,
      daysOfWeek: form.daysOfWeek.length === 7 ? [0, 1, 2, 3, 4, 5, 6] : form.daysOfWeek,
    };
    if (editing) {
      await updateRow('habits', editing.id, payload);
      toast.success('Habitude mise à jour');
    } else {
      await addRow('habits', {
        id: crypto.randomUUID(),
        ...payload,
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
    if (date > today) return;
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

  const recurrenceLabel = (h: Habit) => {
    const days = h.daysOfWeek;
    if (!days || days.length === 0 || days.length === 7) return 'Tous les jours';
    if (days.length === 5 && [0, 1, 2, 3, 4].every(d => days.includes(d))) return 'Jours ouvrés';
    if (days.length === 2 && days.includes(5) && days.includes(6)) return 'Week-end';
    return days.map(d => DAY_LABELS[d]).join(', ');
  };

  const heatColor = (v: number | undefined) => {
    if (v === undefined || v < 0) return 'bg-secondary/40';
    if (v === 0) return 'bg-secondary';
    if (v < 0.34) return 'bg-primary/25';
    if (v < 0.67) return 'bg-primary/55';
    if (v < 1) return 'bg-primary/80';
    return 'bg-primary';
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className={HEADER_BAR}>
        <div className={HEADER_GRID}>
          <LogoSwitch className="pointer-events-auto shrink-0" />
          <div className="flex justify-center min-w-0">
            <nav className={NAV_PILL} aria-label="Habitudes">
              <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
                {VIEW_TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    className={navItemClass(view === id)}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5 inline opacity-80" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>
          </div>
          <div aria-hidden />
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-4 flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {(view === 'week') && (
            <>
              <button onClick={prevWeek} aria-label="Semaine précédente" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-semibold capitalize min-w-[150px] text-center">{monthLabel}</h1>
              <button onClick={nextWeek} aria-label="Semaine suivante" className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <Button size="sm" variant="outline" className="h-9 rounded-full px-3 text-xs" onClick={goToday}>Aujourd'hui</Button>
            </>
          )}
          {(view === 'today' || view === 'stats') && (
            <h1 className="text-lg font-semibold">
              {view === 'today' ? "Aujourd'hui" : 'Statistiques'}
            </h1>
          )}
          {view === 'heatmap' && (
            <h1 className="text-lg font-semibold">Heatmap · 16 semaines</h1>
          )}

          {(view === 'today' || view === 'week') && habits.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="h-9 rounded-full bg-secondary border-0 text-xs px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>Trier : {o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <Button size="sm" className="h-10 rounded-full gap-1.5 px-4" onClick={openNew}>
          <Plus className="h-4 w-4" />Nouvelle habitude
        </Button>
      </div>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 pb-16 pt-5 space-y-5 w-full">
        {/* Progression du jour — visible partout */}
        <section className="surface p-5 rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-muted-foreground">À faire aujourd'hui</p>
              <p className="text-2xl font-semibold mt-0.5">
                {doneTodayCount}
                <span className="text-muted-foreground text-base font-normal"> / {dueToday.length}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Flame className={`h-4 w-4 ${progress === 100 && dueToday.length ? 'text-orange-500' : ''}`} />
                {dueToday.length === 0
                  ? 'Rien de prévu'
                  : progress === 100
                    ? 'Journée impeccable 🔥'
                    : `${progress}%`}
              </span>
              {habitStats.some(s => s.streak > 0) && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  Max série {Math.max(0, ...habitStats.map(s => s.streak))}j
                </span>
              )}
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
          <EmptyState onAdd={openNew} />
        ) : (
          <>
            {/* ════ TODAY ════ */}
            {view === 'today' && (
              <div className="space-y-2.5">
                {sortedStats.map(({ habit, set, streak, rate, scheduledToday, doneToday }) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    streak={streak}
                    rate={rate}
                    recurrence={recurrenceLabel(habit)}
                    scheduledToday={scheduledToday}
                    doneToday={doneToday}
                    onToggle={() => toggleDay(habit.id, today)}
                    onEdit={() => openEdit(habit)}
                    onDelete={() => removeHabit(habit.id)}
                  />
                ))}
              </div>
            )}

            {/* ════ WEEK ════ */}
            {view === 'week' && (
              <div className="space-y-3">
                <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_repeat(7,minmax(36px,1fr))_52px] gap-1.5 px-3 text-[11px] text-muted-foreground font-medium">
                  <div />
                  {week.map((d, i) => (
                    <div key={d} className={`text-center ${d === today ? 'text-primary font-semibold' : ''}`}>
                      {DAY_LABELS[i]}
                      <div className="tabular-nums">{Number(d.slice(8))}</div>
                    </div>
                  ))}
                  <div className="text-center">Série</div>
                </div>

                {sortedStats.map(({ habit, set, streak }) => (
                  <div
                    key={habit.id}
                    className="group rounded-2xl border border-border bg-card px-3 py-3 sm:py-2.5 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(7,minmax(36px,1fr))_52px] gap-2 sm:gap-1.5 sm:items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${habit.color}22` }}
                        >
                          {habit.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{habit.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{recurrenceLabel(habit)}</p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <IconBtn onClick={() => openEdit(habit)} label="Modifier"><Pencil className="h-3.5 w-3.5" /></IconBtn>
                          <IconBtn onClick={() => removeHabit(habit.id)} label="Supprimer" danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                        </div>
                      </div>

                      <div className="flex sm:contents justify-between gap-1">
                        {week.map((d, i) => {
                          const scheduled = isScheduled(habit, d);
                          const done = set.has(d);
                          const isToday = d === today;
                          const isFuture = d > today;
                          return (
                            <button
                              key={d}
                              type="button"
                              disabled={isFuture || !scheduled}
                              onClick={() => scheduled && toggleDay(habit.id, d)}
                              title={
                                !scheduled
                                  ? `${DAY_LABELS[i]} — non planifié`
                                  : `${DAY_LABELS[i]} ${d}${done ? ' — fait' : ''}`
                              }
                              className={`h-10 w-10 sm:h-9 sm:w-full sm:max-w-[40px] mx-auto rounded-full flex flex-col items-center justify-center transition-all ${
                                !scheduled
                                  ? 'opacity-20 cursor-default'
                                  : isFuture
                                    ? 'opacity-30 cursor-not-allowed'
                                    : done
                                      ? 'text-white shadow-sm'
                                      : isToday
                                        ? 'border-2 border-primary/40 hover:border-primary text-muted-foreground'
                                        : 'bg-secondary/60 hover:bg-secondary text-muted-foreground'
                              }`}
                              style={done && scheduled ? { backgroundColor: habit.color } : undefined}
                            >
                              <span className="sm:hidden text-[9px] leading-none mb-0.5 opacity-70">{DAY_SHORT[i]}</span>
                              {done && scheduled
                                ? <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                : scheduled
                                  ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                                  : <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />}
                            </button>
                          );
                        })}
                      </div>

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
                ))}
              </div>
            )}

            {/* ════ HEATMAP ════ */}
            {view === 'heatmap' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Afficher :</span>
                  <button
                    type="button"
                    onClick={() => setHeatmapHabitId('all')}
                    className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                      heatmapHabitId === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Toutes
                  </button>
                  {habits.map(h => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHeatmapHabitId(h.id)}
                      className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                        heatmapHabitId === h.id ? 'text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                      style={heatmapHabitId === h.id ? { backgroundColor: h.color } : undefined}
                    >
                      {h.emoji} {h.name}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 md:p-5 overflow-x-auto">
                  {/* Month labels */}
                  <div className="flex mb-1.5 ml-8 min-w-[560px]">
                    {heat.monthLabels.map((m, i) => {
                      const next = heat.monthLabels[i + 1]?.weekIndex ?? 16;
                      const span = next - m.weekIndex;
                      return (
                        <div
                          key={`${m.label}-${m.weekIndex}`}
                          className="text-[10px] text-muted-foreground capitalize"
                          style={{ width: `${(span / 16) * 100}%` }}
                        >
                          {m.label}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-1.5 min-w-[560px]">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground justify-around">
                      {DAY_SHORT.map((l, i) => (
                        <div key={i} className="h-[13px] leading-[13px]">{i % 2 === 1 ? l : ''}</div>
                      ))}
                    </div>

                    {/* Weeks as columns */}
                    <div className="flex gap-[3px] flex-1">
                      {heat.weeks.map((w, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px] flex-1">
                          {w.map(d => {
                            const v = heatValues.get(d);
                            const isToday = d === today;
                            return (
                              <div
                                key={d}
                                title={`${d}${v !== undefined && v >= 0 ? ` · ${Math.round(v * 100)}%` : ' · —'}`}
                                className={`h-[13px] w-full rounded-[3px] ${heatColor(v)} ${isToday ? 'ring-1 ring-primary ring-offset-1 ring-offset-card' : ''}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-4 text-[10px] text-muted-foreground justify-end">
                    <span>Moins</span>
                    <span className="h-3 w-3 rounded-[3px] bg-secondary" />
                    <span className="h-3 w-3 rounded-[3px] bg-primary/25" />
                    <span className="h-3 w-3 rounded-[3px] bg-primary/55" />
                    <span className="h-3 w-3 rounded-[3px] bg-primary/80" />
                    <span className="h-3 w-3 rounded-[3px] bg-primary" />
                    <span>Plus</span>
                  </div>
                </div>
              </div>
            )}

            {/* ════ STATS ════ */}
            {view === 'stats' && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-3 gap-3">
                  <StatCard
                    icon={<Percent className="h-4 w-4 text-primary" />}
                    label="Taux moyen (90j)"
                    value={`${habitStats.length ? Math.round(habitStats.reduce((s, x) => s + x.rate, 0) / habitStats.length) : 0}%`}
                  />
                  <StatCard
                    icon={<Flame className="h-4 w-4 text-orange-500" />}
                    label="Meilleure série"
                    value={`${Math.max(0, ...habitStats.map(s => s.streak))} j`}
                  />
                  <StatCard
                    icon={<Trophy className="h-4 w-4 text-amber-500" />}
                    label="Complétions (90j)"
                    value={`${habitStats.reduce((s, x) => s + x.done, 0)}`}
                  />
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
                  <p className="text-sm font-semibold mb-1">Taux de complétion · 30 jours</p>
                  <p className="text-xs text-muted-foreground mb-4">% d'habitudes faites parmi celles prévues chaque jour</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="habitArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }}
                          formatter={(v: number) => [`${v}%`, 'Complétion']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ''}
                        />
                        <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="url(#habitArea)" strokeWidth={2} connectNulls={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
                  <p className="text-sm font-semibold mb-1">Réussite par habitude · 90 jours</p>
                  <p className="text-xs text-muted-foreground mb-4">Trié du plus constant au moins suivi</p>
                  {rateBars.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Pas encore de données</p>
                  ) : (
                    <div style={{ height: Math.max(160, rateBars.length * 40) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rateBars} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }}
                            formatter={(v: number, _: string, item: any) => [`${v}% (${item.payload.done}/${item.payload.expected})`, 'Réussite']}
                          />
                          <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={18}>
                            {rateBars.map((e, i) => (
                              <Cell key={i} fill={e.color} />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Détail tableau */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Habitude</th>
                        <th className="px-3 py-3 font-medium hidden sm:table-cell">Récurrence</th>
                        <th className="px-3 py-3 font-medium text-right">Série</th>
                        <th className="px-3 py-3 font-medium text-right">90j</th>
                        <th className="px-4 py-3 font-medium text-right">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...habitStats].sort((a, b) => b.rate - a.rate).map(({ habit, streak, done, expected, rate }) => (
                        <tr key={habit.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                          <td className="px-4 py-3">
                            <span className="mr-2">{habit.emoji}</span>
                            <span className="font-medium">{habit.name}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell">{recurrenceLabel(habit)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {streak > 0 ? (
                              <span className="inline-flex items-center gap-1 justify-end">
                                <Flame className="h-3 w-3 text-orange-500" />{streak}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{done}/{expected}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className="inline-block min-w-[3rem] text-right font-semibold tabular-nums"
                              style={{ color: rate >= 80 ? habit.color : undefined }}
                            >
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'habitude" : 'Nouvelle habitude'}</DialogTitle>
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

            <div className="space-y-2">
              <Label>Récurrence</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <PresetChip active={form.daysOfWeek.length === 7} onClick={() => setFormPreset('daily')}>Tous les jours</PresetChip>
                <PresetChip active={form.daysOfWeek.length === 5 && form.daysOfWeek.every(d => d < 5)} onClick={() => setFormPreset('weekdays')}>Jours ouvrés</PresetChip>
                <PresetChip active={form.daysOfWeek.length === 2 && form.daysOfWeek.includes(5) && form.daysOfWeek.includes(6)} onClick={() => setFormPreset('weekend')}>Week-end</PresetChip>
              </div>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => {
                  const on = form.daysOfWeek.includes(i);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleFormDay(i)}
                      className={`flex-1 h-10 rounded-xl text-xs font-medium transition-all ${
                        on
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                L'habitude ne comptera que les jours sélectionnés pour les séries et le taux de réussite.
              </p>
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

/* ───────────────── Sub-components ───────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border border-dashed border-border rounded-2xl">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Target className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold">Aucune habitude pour l'instant</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Définis des routines (sport, lecture, hydratation…), choisis les jours, et suis ta discipline avec heatmap et stats.
        </p>
      </div>
      <Button className="rounded-full gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" />Créer une habitude
      </Button>
    </div>
  );
}

function HabitRow({
  habit, streak, rate, recurrence, scheduledToday, doneToday, onToggle, onEdit, onDelete,
}: {
  habit: Habit;
  streak: number;
  rate: number;
  recurrence: string;
  scheduledToday: boolean;
  doneToday: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-[var(--shadow-card)]">
      <button
        type="button"
        disabled={!scheduledToday}
        onClick={onToggle}
        className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all ${
          !scheduledToday
            ? 'opacity-30 cursor-default bg-secondary'
            : doneToday
              ? 'text-white shadow-md scale-100'
              : 'border-2 border-primary/30 hover:border-primary text-muted-foreground bg-secondary/40'
        }`}
        style={doneToday && scheduledToday ? { backgroundColor: habit.color } : undefined}
        aria-label={doneToday ? 'Marquer non fait' : 'Marquer fait'}
      >
        {doneToday && scheduledToday ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="text-lg">{habit.emoji}</span>}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`font-medium text-sm truncate ${doneToday && scheduledToday ? 'line-through opacity-60' : ''}`}>
          {!doneToday && scheduledToday && <span className="mr-1.5">{habit.emoji}</span>}
          {habit.name}
        </p>
        <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          <span>{recurrence}</span>
          {!scheduledToday && <span className="text-amber-600/80">· pas prévu aujourd'hui</span>}
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Flame className="h-3 w-3 text-orange-500" />{streak}j
            </span>
          )}
          <span>· {rate}% (90j)</span>
        </p>
      </div>

      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <IconBtn onClick={onEdit} label="Modifier"><Pencil className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn onClick={onDelete} label="Supprimer" danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children, onClick, label, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors ${
        danger
          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </button>
  );
}

function PresetChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
