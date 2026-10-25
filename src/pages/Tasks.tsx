import { useMemo, useState, useRef, useEffect } from 'react';
import { LogoSwitch } from '@/components/trading/LogoSwitch';
import { HEADER_BAR, HEADER_GRID, NAV_PILL, navItemClass } from '@/components/trading/navStyles';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Check, CheckSquare, Circle, Plus, Trash2, Pencil, Calendar,
  ListTodo, Inbox, X, ChevronDown, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

/* ───────────────── Types ───────────────── */

interface TaskList {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface Task {
  id: string;
  listId: string;
  title: string;
  done: boolean;
  dueDate?: string | null; // YYYY-MM-DD
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string | null;
}

type FilterMode = 'active' | 'done' | 'all';
type SortKey = 'due' | 'priority' | 'created' | 'alpha';

const LIST_COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa',
  '#a78bfa', '#fb7185', '#2dd4bf', '#f97316', '#94a3b8',
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomUUID();
}

/* ───────────────── Page ───────────────── */

export default function Tasks() {
  const { data, updateRow, deleteRow, saveTable, saveData } = useData();
  const lists = ((data.taskLists || []) as TaskList[]).slice().sort(
    (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
  );
  const tasks = (data.tasks || []) as Task[];

  const [activeListId, setActiveListId] = useState<string | 'all'>('all');
  const [filter, setFilter] = useState<FilterMode>('active');
  const [sortKey, setSortKey] = useState<SortKey>('due');
  const [newTitle, setNewTitle] = useState('');
  const [quickDue, setQuickDue] = useState('');
  const [quickPriority, setQuickPriority] = useState<Task['priority']>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  const [listDialog, setListDialog] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [listForm, setListForm] = useState({ name: '', color: LIST_COLORS[0] });

  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    notes: '',
    dueDate: '',
    priority: 'medium' as Task['priority'],
    listId: '',
  });

  const today = todayStr();

  // Ensure at least one default list exists conceptually for new tasks

  const counts = useMemo(() => {
    const byList: Record<string, { active: number; done: number }> = {};
    let allActive = 0;
    let allDone = 0;
    for (const t of tasks) {
      if (!byList[t.listId]) byList[t.listId] = { active: 0, done: 0 };
      if (t.done) {
        byList[t.listId].done += 1;
        allDone += 1;
      } else {
        byList[t.listId].active += 1;
        allActive += 1;
      }
    }
    return { byList, allActive, allDone };
  }, [tasks]);

  const visible = useMemo(() => {
    let list = tasks.filter(t => {
      if (activeListId !== 'all' && t.listId !== activeListId) return false;
      if (filter === 'active' && t.done) return false;
      if (filter === 'done' && !t.done) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      // Done tasks always last when showing "all"
      if (filter === 'all' && a.done !== b.done) return a.done ? 1 : -1;

      if (sortKey === 'priority') {
        const pa = PRIORITY_ORDER[a.priority || 'medium'];
        const pb = PRIORITY_ORDER[b.priority || 'medium'];
        if (pa !== pb) return pa - pb;
      }
      if (sortKey === 'alpha') return a.title.localeCompare(b.title, 'fr');
      if (sortKey === 'created') return (b.createdAt || '').localeCompare(a.createdAt || '');

      // due (default): no date last, then earliest first
      const da = a.dueDate || '9999-99-99';
      const db = b.dueDate || '9999-99-99';
      if (da !== db) return da.localeCompare(db);
      const pa = PRIORITY_ORDER[a.priority || 'medium'];
      const pb = PRIORITY_ORDER[b.priority || 'medium'];
      return pa - pb;
    });

    return list;
  }, [tasks, activeListId, filter, sortKey]);

  const overdueCount = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today).length;
  const dueTodayCount = tasks.filter(t => !t.done && t.dueDate === today).length;

  /* ── Lists CRUD ── */

  const openNewList = () => {
    setEditingList(null);
    setListForm({ name: '', color: LIST_COLORS[lists.length % LIST_COLORS.length] });
    setListDialog(true);
  };

  const openEditList = (l: TaskList) => {
    setEditingList(l);
    setListForm({ name: l.name, color: l.color });
    setListDialog(true);
  };

  const saveList = async () => {
    const name = listForm.name.trim();
    if (!name) {
      toast.error('Nom de liste requis');
      return;
    }
    if (editingList) {
      await updateRow('taskLists', editingList.id, { name, color: listForm.color });
      toast.success('Liste mise à jour');
    } else {
      try {
        const id = uid();
        const cur = data;
        const existingLists = Array.isArray(cur.taskLists) ? (cur.taskLists as TaskList[]) : [];
        await saveData({
          ...cur,
          taskLists: [
            ...existingLists,
            { id, name, color: listForm.color, createdAt: new Date().toISOString() },
          ],
          tasks: Array.isArray(cur.tasks) ? cur.tasks : [],
        });
        setActiveListId(id);
        toast.success('Liste créée');
      } catch (e: any) {
        toast.error(e?.message || 'Impossible de créer la liste');
        return;
      }
    }
    setListDialog(false);
  };

  const removeList = async (id: string) => {
    if (!confirm('Supprimer cette liste et toutes ses tâches ?')) return;
    const remaining = tasks.filter(t => t.listId !== id);
    await saveTable('tasks', remaining);
    await deleteRow('taskLists', id);
    if (activeListId === id) setActiveListId('all');
    toast.success('Liste supprimée');
  };

  /* ── Tasks CRUD ── */

  const addQuickTask = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error('Écris le titre de la tâche');
      inputRef.current?.focus();
      return;
    }
    try {
      const cur = data;
      const existingLists = Array.isArray(cur.taskLists) ? (cur.taskLists as TaskList[]) : [];
      const existingTasks = Array.isArray(cur.tasks) ? (cur.tasks as Task[]) : [];

      let listId = activeListId !== 'all' ? activeListId : (existingLists[0]?.id ?? '');
      let nextLists = existingLists;

      if (!listId) {
        listId = uid();
        nextLists = [
          ...existingLists,
          {
            id: listId,
            name: 'Inbox',
            color: LIST_COLORS[0],
            createdAt: new Date().toISOString(),
          },
        ];
      }

      const newTask: Task = {
        id: uid(),
        listId,
        title,
        done: false,
        dueDate: quickDue || null,
        priority: quickPriority || 'medium',
        notes: '',
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      await saveData({
        ...cur,
        taskLists: nextLists,
        tasks: [...existingTasks, newTask],
      });

      if (activeListId === 'all' && !existingLists.length) {
        setActiveListId(listId);
      }
      setNewTitle('');
      setQuickDue('');
      inputRef.current?.focus();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Impossible d'ajouter la tâche");
    }
  };

  const toggleDone = async (task: Task) => {
    await updateRow('tasks', task.id, {
      done: !task.done,
      completedAt: !task.done ? new Date().toISOString() : null,
    });
  };

  const removeTask = async (id: string) => {
    await deleteRow('tasks', id);
  };

  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskForm({
      title: t.title,
      notes: t.notes || '',
      dueDate: t.dueDate || '',
      priority: t.priority || 'medium',
      listId: t.listId,
    });
    setTaskDialog(true);
  };

  const saveTaskEdit = async () => {
    if (!editingTask) return;
    const title = taskForm.title.trim();
    if (!title) {
      toast.error('Titre requis');
      return;
    }
    await updateRow('tasks', editingTask.id, {
      title,
      notes: taskForm.notes,
      dueDate: taskForm.dueDate || null,
      priority: taskForm.priority,
      listId: taskForm.listId || editingTask.listId,
    });
    setTaskDialog(false);
    toast.success('Tâche mise à jour');
  };

  const clearDone = async () => {
    const kept = tasks.filter(t => {
      if (activeListId !== 'all' && t.listId !== activeListId) return true;
      return !t.done;
    });
    if (kept.length === tasks.length) {
      toast.message('Aucune tâche terminée à purger');
      return;
    }
    if (!confirm('Supprimer toutes les tâches terminées de cette vue ?')) return;
    await saveTable('tasks', kept);
    toast.success('Tâches terminées supprimées');
  };

  const listName = (id: string) => lists.find(l => l.id === id)?.name || 'Sans liste';
  const listColor = (id: string) => lists.find(l => l.id === id)?.color || '#94a3b8';

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className={HEADER_BAR}>
        <div className={HEADER_GRID}>
          <LogoSwitch className="pointer-events-auto shrink-0" />
          <div className="flex justify-center min-w-0">
            <nav className={NAV_PILL} aria-label="Tâches">
              <span className={navItemClass(true)}>
                <CheckSquare className="h-3.5 w-3.5 mr-1.5 inline" />
                Tâches
              </span>
            </nav>
          </div>
          <div aria-hidden />
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 md:px-6 pt-4 w-full flex flex-col gap-4 flex-1 pb-16">
        {/* Stats strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-card border border-border">
            <Circle className="h-3 w-3 text-primary" />
            {counts.allActive} active{counts.allActive !== 1 ? 's' : ''}
          </span>
          {dueTodayCount > 0 && (
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Calendar className="h-3 w-3" />
              {dueTodayCount} aujourd'hui
            </span>
          )}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              {overdueCount} en retard
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-card border border-border text-muted-foreground">
            <Check className="h-3 w-3" />
            {counts.allDone} terminée{counts.allDone !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
          {/* ── Sidebar lists ── */}
          <aside className="rounded-2xl border border-border bg-card p-2 space-y-0.5 lg:sticky lg:top-20">
            <button
              type="button"
              onClick={() => setActiveListId('all')}
              className={`w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm transition-colors ${
                activeListId === 'all'
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Toutes</span>
              <span className="text-xs tabular-nums opacity-70">{counts.allActive}</span>
            </button>

            {lists.map(l => (
              <div key={l.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setActiveListId(l.id)}
                  className={`w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm transition-colors ${
                    activeListId === l.id
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="flex-1 text-left truncate">{l.name}</span>
                  <span className="text-xs tabular-nums opacity-70">{counts.byList[l.id]?.active ?? 0}</span>
                </button>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-card/90 rounded-lg pl-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEditList(l); }}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                    aria-label="Modifier la liste"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeList(l.id); }}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Supprimer la liste"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={openNewList}
              className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mt-1"
            >
              <Plus className="h-4 w-4" />
              Nouvelle liste
            </button>
          </aside>

          {/* ── Main ── */}
          <div className="space-y-3 min-w-0">
            {/* Quick add */}
            <div className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
              <form
                onSubmit={(e) => { e.preventDefault(); addQuickTask(); }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <ListTodo className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={inputRef}
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ajouter une tâche…"
                    className="h-11 pl-10 rounded-xl bg-secondary border-transparent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Input
                    type="date"
                    value={quickDue}
                    onChange={e => setQuickDue(e.target.value)}
                    className="h-11 w-full sm:w-[150px] rounded-xl bg-secondary border-transparent text-xs"
                    title="Échéance"
                  />
                  <select
                    value={quickPriority}
                    onChange={e => setQuickPriority(e.target.value as Task['priority'])}
                    className="h-11 rounded-xl bg-secondary border-0 text-xs px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Normale</option>
                    <option value="high">Haute</option>
                  </select>
                  <Button type="submit" className="h-11 rounded-xl px-4 gap-1.5 shrink-0">
                    <Plus className="h-4 w-4" />Ajouter
                  </Button>
                </div>
              </form>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-full bg-card border border-border">
                {([
                  ['active', 'À faire'],
                  ['done', 'Terminées'],
                  ['all', 'Toutes'],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={`h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                      filter === k
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value as SortKey)}
                    className="h-8 rounded-full bg-secondary border-0 text-xs px-2.5 text-foreground focus:outline-none"
                  >
                    <option value="due">Échéance</option>
                    <option value="priority">Priorité</option>
                    <option value="created">Création</option>
                    <option value="alpha">Nom</option>
                  </select>
                </div>
                {filter !== 'active' && (
                  <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={clearDone}>
                    Purger terminées
                  </Button>
                )}
              </div>
            </div>

            {/* Task list */}
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border border-dashed border-border rounded-2xl">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CheckSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {filter === 'done' ? 'Aucune tâche terminée' : 'Rien à faire ici'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filter === 'active' ? 'Ajoute une tâche ci-dessus pour commencer.' : 'Change de filtre pour en voir d’autres.'}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {visible.map(task => {
                  const overdue = !task.done && !!task.dueDate && task.dueDate < today;
                  const isToday = !task.done && task.dueDate === today;
                  return (
                    <li
                      key={task.id}
                      className={`group flex items-start gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-[var(--shadow-card)] transition-opacity ${
                        task.done ? 'opacity-60' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDone(task)}
                        className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center transition-all ${
                          task.done
                            ? 'bg-primary text-primary-foreground'
                            : 'border-2 border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary/40'
                        }`}
                        aria-label={task.done ? 'Marquer non faite' : 'Marquer faite'}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium leading-snug ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                          {activeListId === 'all' && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: listColor(task.listId) }} />
                              {listName(task.listId)}
                            </span>
                          )}
                          {task.priority === 'high' && (
                            <span className="text-destructive font-medium">Haute</span>
                          )}
                          {task.priority === 'low' && <span>Basse</span>}
                          {task.dueDate && (
                            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : isToday ? 'text-primary font-medium' : ''}`}>
                              <Calendar className="h-3 w-3" />
                              {overdue ? 'En retard · ' : isToday ? "Aujourd'hui" : ''}
                              {!isToday && formatDue(task.dueDate)}
                            </span>
                          )}
                          {task.notes && (
                            <span className="truncate max-w-[200px] opacity-70">{task.notes}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditTask(task)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTask(task.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* List dialog */}
      <Dialog open={listDialog} onOpenChange={setListDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingList ? 'Modifier la liste' : 'Nouvelle liste'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={listForm.name}
                onChange={e => setListForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex. Perso, Travail…"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {LIST_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setListForm(f => ({ ...f, color: c }))}
                    className={`h-8 w-8 rounded-full transition-transform ${listForm.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setListDialog(false)}>Annuler</Button>
              <Button className="rounded-full" onClick={saveList}>{editingList ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task edit dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={taskForm.notes}
                onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Détails optionnels…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Échéance</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <select
                  value={taskForm.priority}
                  onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}
                  className="w-full h-10 rounded-xl bg-secondary border-0 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Normale</option>
                  <option value="high">Haute</option>
                </select>
              </div>
            </div>
            {lists.length > 0 && (
              <div className="space-y-2">
                <Label>Liste</Label>
                <select
                  value={taskForm.listId}
                  onChange={e => setTaskForm(f => ({ ...f, listId: e.target.value }))}
                  className="w-full h-10 rounded-xl bg-secondary border-0 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setTaskDialog(false)}>
                <X className="h-4 w-4 mr-1" />Annuler
              </Button>
              <Button className="rounded-full" onClick={saveTaskEdit}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDue(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
