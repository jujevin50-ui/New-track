import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Banknote, ChevronDown, ChevronRight, ClipboardList, Copy, FileText, Pencil, Plus, Trash2, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { Donut, MultiLineChart, ValueAreaChart, PALETTE, PROFIT } from './financeCharts';
import { toast } from 'sonner';

/* ───────────── Types ───────────── */
export interface StatementHolding {
  id: string;
  name: string;
  quantity?: number | null;
  unitPrice?: number | null;
  value: number;
}

export interface FinanceStatement {
  id: string;
  accountId: string;
  date: string;            // YYYY-MM-DD
  totalValue: number;
  deposited?: number | null; // capital versé cumulé à cette date
  holdings: StatementHolding[];
  notes?: string;
}

interface AccountLite { id: string; name: string; type: string; institution?: string; archived?: boolean; initialCapital?: number | null; initialDate?: string | null }

interface Props {
  accounts: AccountLite[];
  statements: FinanceStatement[];
  /** Compte présélectionné (ex: depuis le bouton « Relevés » d'une carte compte) */
  initialAccountId?: string;
  onSave: (statement: FinanceStatement, isEdit: boolean, applyBalance: boolean) => Promise<void>;
  onDelete: (statement: FinanceStatement) => Promise<void>;
  /** Définit (ou supprime avec null) le capital initial et sa date pour un compte */
  onSetInitial: (accountId: string, capital: number | null, date: string | null) => Promise<void>;
}

/* ───────────── Helpers ───────────── */
const INVEST_TYPES = ['Assurance-vie', 'PEA', 'CTO', 'Crypto', 'Épargne'];
const eur = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const eurShort = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const signed = (n: number) => `${n > 0 ? '+' : ''}${eur(n)}`;
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)} %`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (s: string | number | null | undefined) => {
  const n = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const hasNum = (s: string) => s.trim() !== '' && Number.isFinite(parseFloat(s.replace(',', '.')));
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
const norm = (s: string) => s.trim().toLowerCase();
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
const fmtDuration = (days: number) => {
  if (days < 60) return `${days} j`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12); const m = months % 12;
  return `${y} an${y > 1 ? 's' : ''}${m ? ` ${m} mois` : ''}`;
};
const initialOfAccount = (a?: AccountLite) => {
  const c = Number(a?.initialCapital);
  return a && Number.isFinite(c) && c > 0 && a.initialDate ? { capital: c, date: a.initialDate } : null;
};
const tone = (n: number) => (n > 0 ? 'text-emerald-400' : n < 0 ? 'text-rose-400' : 'text-muted-foreground');

/* Form types (champs texte pour accepter la virgule française) */
interface HoldingDraft { id: string; name: string; quantity: string; unitPrice: string; value: string }
interface Draft {
  id: string;
  accountId: string;
  date: string;
  deposited: string;
  totalManual: string;
  holdings: HoldingDraft[];
  notes: string;
  applyBalance: boolean;
}
const emptyHolding = (): HoldingDraft => ({ id: uid('h'), name: '', quantity: '', unitPrice: '', value: '' });

/* ───────────── Composant principal ───────────── */
export function StatementsView({ accounts, statements, initialAccountId, onSave, onDelete, onSetInitial }: Props) {
  const safeStatements = useMemo(
    () => (statements || []).map(s => ({ ...s, holdings: Array.isArray(s.holdings) ? s.holdings : [] })),
    [statements],
  );
  const accountById = (id: string) => accounts.find(a => a.id === id);
  const accountName = (id: string) => accountById(id)?.name || 'Compte supprimé';

  const byAccount = useMemo(() => {
    const map: Record<string, FinanceStatement[]> = {};
    safeStatements.forEach(s => { (map[s.accountId] ||= []).push(s); });
    Object.values(map).forEach(list => list.sort((a, b) => a.date.localeCompare(b.date)));
    return map;
  }, [safeStatements]);

  const defaultSelected = useMemo(() => {
    if (initialAccountId && accounts.some(a => a.id === initialAccountId)) return initialAccountId;
    const withData = accounts.find(a => byAccount[a.id]?.length);
    return withData ? withData.id : 'all';
  }, [initialAccountId, accounts, byAccount]);

  const [selectedRaw, setSelectedRaw] = useState<string>('');
  const selected = selectedRaw && (selectedRaw === 'all' || accounts.some(a => a.id === selectedRaw)) ? selectedRaw : defaultSelected;

  const initial = useMemo(() => (selected === 'all' ? null : initialOfAccount(accounts.find(a => a.id === selected))), [selected, accounts]);
  const [initialOpen, setInitialOpen] = useState(false);
  const [initialForm, setInitialForm] = useState({ capital: '', date: today() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const orderedAccounts = useMemo(() => {
    const rank = (a: AccountLite) => (byAccount[a.id]?.length ? 0 : INVEST_TYPES.includes(a.type) ? 1 : 2);
    return [...accounts].filter(a => !a.archived || byAccount[a.id]?.length).sort((a, b) => rank(a) - rank(b));
  }, [accounts, byAccount]);

  /* ── Données du compte sélectionné ── */
  const list = selected === 'all' ? [] : (byAccount[selected] || []);
  const last = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2] : undefined;
  const first = list[0];

  const kpis = useMemo(() => {
    if (!last) return null;
    const dPrev = prev ? last.totalValue - prev.totalValue : null;
    const dPrevPct = prev && prev.totalValue ? (dPrev! / prev.totalValue) * 100 : null;
    const dFirst = first && list.length > 1 ? last.totalValue - first.totalValue : null;
    const dFirstPct = first && first.totalValue && list.length > 1 ? (dFirst! / first.totalValue) * 100 : null;
    const dep = last.deposited != null && Number(last.deposited) > 0 ? Number(last.deposited) : null;
    const gain = dep != null ? last.totalValue - dep : null;
    const gainPct = dep != null ? (gain! / dep) * 100 : null;
    // Évolution depuis le dépôt initial
    let since: { d: number; p: number; days: number; annual: number | null } | null = null;
    if (initial && last.date >= initial.date) {
      const d = last.totalValue - initial.capital;
      const days = daysBetween(initial.date, last.date);
      const annual = days >= 30 && last.totalValue > 0 ? (Math.pow(last.totalValue / initial.capital, 365 / days) - 1) * 100 : null;
      since = { d, p: (d / initial.capital) * 100, days, annual };
    }
    return { dPrev, dPrevPct, dFirst, dFirstPct, dep, gain, gainPct, since };
  }, [last, prev, first, list.length, initial]);

  const chartData = useMemo(() => {
    const pts = list.map(s => ({ date: s.date, label: fmtShort(s.date), value: Number(s.totalValue), deposited: s.deposited != null && Number(s.deposited) > 0 ? Number(s.deposited) : null }));
    // Le dépôt initial devient le point de départ de la courbe
    if (initial && !pts.some(p => p.date === initial.date)) pts.push({ date: initial.date, label: fmtShort(initial.date), value: initial.capital, deposited: null });
    return pts.sort((a, b) => a.date.localeCompare(b.date));
  }, [list, initial]);
  const hasDeposits = chartData.some(d => d.deposited != null);

  const allocation = useMemo(() => {
    if (!last) return [];
    const total = last.holdings.reduce((s, h) => s + Number(h.value || 0), 0) || 1;
    return last.holdings
      .map(h => {
        const before = prev?.holdings.find(p => norm(p.name) === norm(h.name));
        const valueDelta = before ? Number(h.value) - Number(before.value) : null;
        const priceDelta = before && before.unitPrice && h.unitPrice ? ((Number(h.unitPrice) - Number(before.unitPrice)) / Number(before.unitPrice)) * 100 : null;
        return { ...h, share: (Number(h.value) / total) * 100, valueDelta, priceDelta, isNew: !!prev && !before };
      })
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [last, prev]);

  const assetEvolution = useMemo(() => {
    const names = new Map<string, string>();
    list.forEach(s => s.holdings.forEach(h => { if (h.name.trim() && !names.has(norm(h.name))) names.set(norm(h.name), h.name.trim()); }));
    const keys = [...names.entries()];
    const rows = list.map(s => {
      const row: Record<string, any> = { label: fmtShort(s.date) };
      keys.forEach(([k, display]) => {
        const h = s.holdings.find(x => norm(x.name) === k);
        row[display] = h ? Number(h.value) : null;
      });
      return row;
    });
    return { names: keys.map(([, d]) => d), rows };
  }, [list]);

  /* ── Vue « Tous les comptes » ── */
  const overview = useMemo(() => {
    if (selected !== 'all') return null;
    const accs = accounts.filter(a => byAccount[a.id]?.length);
    const dates = [...new Set(safeStatements.map(s => s.date))].sort();
    const rows = dates.map(d => {
      const row: Record<string, any> = { label: fmtShort(d) };
      let total = 0;
      accs.forEach(a => {
        const sts = byAccount[a.id];
        const exact = sts.find(s => s.date === d);
        if (exact) row[a.name] = Number(exact.totalValue);
        const known = [...sts].filter(s => s.date <= d).pop();
        if (known) total += Number(known.totalValue);
      });
      row.Total = total;
      return row;
    });
    const summary = accs.map(a => {
      const sts = byAccount[a.id];
      const l = sts[sts.length - 1];
      const p = sts.length > 1 ? sts[sts.length - 2] : undefined;
      const ini = initialOfAccount(a);
      const sinceD = ini && l.date >= ini.date ? Number(l.totalValue) - ini.capital : null;
      return { account: a, last: l, since: sinceD != null ? { d: sinceD, p: (sinceD / ini!.capital) * 100 } : null, delta: p ? l.totalValue - Number(p.totalValue) : null, deltaPct: p && p.totalValue ? ((l.totalValue - Number(p.totalValue)) / Number(p.totalValue)) * 100 : null, count: sts.length };
    });
    const total = summary.reduce((s, x) => s + Number(x.last.totalValue), 0);
    return { accs, rows, summary, total };
  }, [selected, accounts, byAccount, safeStatements]);

  const history = useMemo(() => {
    const src = selected === 'all' ? safeStatements : list;
    return [...src].sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, safeStatements, list]);

  const variationOf = (s: FinanceStatement) => {
    const sts = byAccount[s.accountId] || [];
    const i = sts.findIndex(x => x.id === s.id);
    if (i <= 0) {
      const ini = initialOfAccount(accountById(s.accountId));
      if (ini && s.date >= ini.date) { const d = Number(s.totalValue) - ini.capital; return { d, p: (d / ini.capital) * 100 }; }
      return null;
    }
    const p = sts[i - 1];
    const d = Number(s.totalValue) - Number(p.totalValue);
    return { d, p: Number(p.totalValue) ? (d / Number(p.totalValue)) * 100 : 0 };
  };

  const sinceInitialOf = (s: FinanceStatement) => {
    const ini = initialOfAccount(accountById(s.accountId));
    if (!ini || s.date < ini.date) return null;
    const d = Number(s.totalValue) - ini.capital;
    return { d, p: (d / ini.capital) * 100 };
  };
  const showSince = history.some(s => sinceInitialOf(s));

  /* ── Capital initial ── */
  const openInitial = () => {
    setInitialForm({ capital: initial ? String(initial.capital) : '', date: initial?.date || first?.date || today() });
    setInitialOpen(true);
  };
  const saveInitial = async () => {
    const capital = num(initialForm.capital);
    if (!(capital > 0)) return toast.error('Indique un capital initial supérieur à 0.');
    if (!initialForm.date) return toast.error('Indique la date du dépôt.');
    await onSetInitial(selected, round2(capital), initialForm.date);
    setInitialOpen(false);
    toast.success('Capital initial enregistré');
  };
  const clearInitial = async () => {
    await onSetInitial(selected, null, null);
    setInitialOpen(false);
    toast.success('Capital initial supprimé');
  };

  /* ── Édition ── */
  const openNew = () => {
    const accountId = selected !== 'all' ? selected : (orderedAccounts[0]?.id || '');
    setEditing(false);
    setDraft({ id: '', accountId, date: today(), deposited: '', totalManual: '', holdings: [emptyHolding()], notes: '', applyBalance: true });
    setOpen(true);
  };

  const openEdit = (s: FinanceStatement) => {
    const latest = (byAccount[s.accountId] || []).slice(-1)[0];
    setEditing(true);
    setDraft({
      id: s.id,
      accountId: s.accountId,
      date: s.date,
      deposited: s.deposited != null ? String(s.deposited) : '',
      totalManual: s.holdings.length ? '' : String(s.totalValue),
      holdings: s.holdings.length
        ? s.holdings.map(h => ({ id: h.id || uid('h'), name: h.name, quantity: h.quantity != null ? String(h.quantity) : '', unitPrice: h.unitPrice != null ? String(h.unitPrice) : '', value: String(h.value) }))
        : [],
      notes: s.notes || '',
      applyBalance: latest?.id === s.id,
    });
    setOpen(true);
  };

  const patchDraft = (p: Partial<Draft>) => setDraft(d => (d ? { ...d, ...p } : d));

  const patchHolding = (index: number, p: Partial<HoldingDraft>) =>
    setDraft(d => {
      if (!d) return d;
      const holdings = d.holdings.map((h, i) => {
        if (i !== index) return h;
        const next = { ...h, ...p };
        // quantité × prix → valeur calculée automatiquement
        if (('quantity' in p || 'unitPrice' in p) && hasNum(next.quantity) && hasNum(next.unitPrice)) {
          next.value = String(round2(num(next.quantity) * num(next.unitPrice)));
        }
        return next;
      });
      return { ...d, holdings };
    });

  const copyFromPrevious = () => {
    if (!draft) return;
    const sts = (byAccount[draft.accountId] || []).filter(s => s.date <= draft.date && s.id !== draft.id);
    const ref = sts[sts.length - 1] || (byAccount[draft.accountId] || []).slice(-1)[0];
    if (!ref || !ref.holdings.length) return toast.error('Aucun relevé précédent avec des actifs pour ce compte.');
    patchDraft({
      holdings: ref.holdings.map(h => ({ id: uid('h'), name: h.name, quantity: h.quantity != null ? String(h.quantity) : '', unitPrice: h.unitPrice != null ? String(h.unitPrice) : '', value: String(h.value) })),
      deposited: draft.deposited || (ref.deposited != null ? String(ref.deposited) : ''),
    });
    toast.success(`Actifs repris du relevé du ${fmtDate(ref.date)} — mets à jour les prix.`);
  };

  const draftTotal = useMemo(() => {
    if (!draft) return 0;
    const rows = draft.holdings.filter(h => h.name.trim() || hasNum(h.value));
    return rows.length ? rows.reduce((s, h) => s + num(h.value), 0) : num(draft.totalManual);
  }, [draft]);

  const submit = async () => {
    if (!draft) return;
    if (!draft.accountId) return toast.error('Choisis un compte.');
    if (!draft.date) return toast.error('Indique la date du relevé.');
    const rows = draft.holdings.filter(h => h.name.trim() || hasNum(h.value));
    if (rows.some(h => !h.name.trim())) return toast.error('Chaque ligne d’actif doit avoir un nom.');
    if (!rows.length && !hasNum(draft.totalManual)) return toast.error('Ajoute au moins un actif ou indique la valeur totale.');
    const clash = (byAccount[draft.accountId] || []).find(s => s.date === draft.date && s.id !== draft.id);
    if (clash) return toast.error('Un relevé existe déjà à cette date pour ce compte : modifie-le plutôt.');
    const holdings: StatementHolding[] = rows.map(h => ({
      id: h.id,
      name: h.name.trim(),
      quantity: hasNum(h.quantity) ? num(h.quantity) : null,
      unitPrice: hasNum(h.unitPrice) ? num(h.unitPrice) : null,
      value: round2(num(h.value)),
    }));
    const statement: FinanceStatement = {
      id: draft.id || uid('stmt'),
      accountId: draft.accountId,
      date: draft.date,
      totalValue: round2(holdings.length ? holdings.reduce((s, h) => s + h.value, 0) : num(draft.totalManual)),
      deposited: hasNum(draft.deposited) ? num(draft.deposited) : null,
      holdings,
      notes: draft.notes.trim(),
    };
    setSaving(true);
    try {
      await onSave(statement, editing, draft.applyBalance);
      setSelectedRaw(draft.accountId);
      setOpen(false);
      toast.success(editing ? 'Relevé modifié' : 'Relevé enregistré');
    } finally { setSaving(false); }
  };

  const remove = async (s: FinanceStatement) => {
    if (!window.confirm(`Supprimer le relevé du ${fmtDate(s.date)} (${accountName(s.accountId)}) ?`)) return;
    await onDelete(s);
    toast.success('Relevé supprimé');
  };

  /* ───────────── Rendu ───────────── */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Relevés & évolution</h1>
          <p className="text-xs text-muted-foreground mt-1">Saisis tes relevés (assurance-vie, PEA, CTO…) et suis la valeur de tes comptes et de chaque actif dans le temps</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelectedRaw}>
            <SelectTrigger className="w-[220px] h-9 text-xs"><SelectValue placeholder="Compte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les comptes</SelectItem>
              {orderedAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}{byAccount[a.id]?.length ? ` · ${byAccount[a.id].length} relevé${byAccount[a.id].length > 1 ? 's' : ''}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
          {selected !== 'all' && <Button size="sm" variant="outline" onClick={openInitial}><Banknote className="h-4 w-4 mr-1" />{initial ? `Capital initial : ${eurShort(initial.capital)}` : 'Définir le capital initial'}</Button>}
          <Button size="sm" onClick={openNew} disabled={!accounts.length}><Plus className="h-4 w-4 mr-1" />Nouveau relevé</Button>
        </div>
      </div>

      {!accounts.length && <Box><Empty text="Crée d’abord un compte (onglet « Mes comptes ») pour y ajouter des relevés." /></Box>}

      {accounts.length > 0 && !safeStatements.length && (
        <Box>
          <div className="py-10 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center"><ClipboardList className="h-6 w-6 text-sky-400" /></div>
            <p className="text-sm font-semibold">Aucun relevé pour l’instant</p>
            <p className="text-xs text-muted-foreground max-w-md">Chaque mois, ajoute un relevé de ton assurance-vie ou de tes placements : la valeur totale, ou le détail par actif (quantité × prix). Tu verras ensuite l’évolution et la répartition.</p>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ajouter mon premier relevé</Button>
          </div>
        </Box>
      )}

      {/* ───── Vue « Tous les comptes » ───── */}
      {selected === 'all' && overview && overview.accs.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Metric title="Total des derniers relevés" value={eur(overview.total)} />
            <Metric title="Comptes suivis" value={String(overview.accs.length)} />
            <Metric title="Relevés enregistrés" value={String(safeStatements.length)} />
          </div>
          <Box title="Évolution globale" subtitle="Total (dernière valeur connue de chaque compte) et valeur de chaque compte à la date de ses relevés">
            <div className="h-[320px]">
              <MultiLineChart rows={overview.rows} series={[{ key: 'Total', color: PROFIT, strong: true }, ...overview.accs.map((a, i) => ({ key: a.name, color: PALETTE[(i + 1) % PALETTE.length] }))]} />
            </div>
          </Box>
          <Box title="Dernier relevé par compte">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-2.5">Compte</th><th className="text-right">Date</th><th className="text-right">Valeur</th><th className="text-right">Vs relevé précédent</th><th className="text-right">Depuis le dépôt</th><th className="text-right">Relevés</th><th /></tr></thead>
                <tbody>
                  {overview.summary.map(x => (
                    <tr key={x.account.id} className="border-b border-border/40">
                      <td className="py-2.5 font-medium">{x.account.name}<span className="text-muted-foreground font-normal"> · {x.account.type}</span></td>
                      <td className="text-right text-muted-foreground">{fmtDate(x.last.date)}</td>
                      <td className="text-right font-mono">{eur(Number(x.last.totalValue))}</td>
                      <td className={`text-right font-mono ${tone(x.delta ?? 0)}`}>{x.delta == null ? '—' : `${signed(x.delta)} (${pct(x.deltaPct ?? 0)})`}</td>
                      <td className={`text-right font-mono ${tone(x.since?.d ?? 0)}`}>{x.since ? `${signed(x.since.d)} (${pct(x.since.p)})` : '—'}</td>
                      <td className="text-right">{x.count}</td>
                      <td className="text-right"><button className="text-[11px] text-sky-400 hover:underline" onClick={() => setSelectedRaw(x.account.id)}>Détail</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Box>
        </>
      )}

      {/* ───── Vue d'un compte ───── */}
      {selected !== 'all' && accounts.length > 0 && safeStatements.length > 0 && !last && (
        <Box><div className="py-8 flex flex-col items-center gap-3"><Empty text={`Aucun relevé pour « ${accountName(selected)} ».`} /><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Ajouter un relevé</Button></div></Box>
      )}

      {selected !== 'all' && last && kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric title={`Valeur au ${fmtDate(last.date)}`} value={eur(Number(last.totalValue))} />
            <Metric title="Vs relevé précédent" value={kpis.dPrev == null ? '—' : signed(kpis.dPrev)} sub={kpis.dPrevPct == null ? undefined : pct(kpis.dPrevPct)} toneClass={tone(kpis.dPrev ?? 0)} icon={kpis.dPrev != null && kpis.dPrev < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />} />
            {kpis.since ? (
              <Metric title="Depuis le dépôt initial" value={signed(kpis.since.d)} toneClass={tone(kpis.since.d)} icon={kpis.since.d < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                sub={`${pct(kpis.since.p)} · depuis le ${fmtDate(initial!.date)} (${fmtDuration(kpis.since.days)})${kpis.since.annual != null ? ` · ≈ ${pct(kpis.since.annual)}/an` : ''}`} />
            ) : (
              <Metric title="Depuis le 1er relevé" value={kpis.dFirst == null ? '—' : signed(kpis.dFirst)} sub={kpis.dFirstPct == null ? (initial ? 'Ce relevé est antérieur au dépôt initial' : undefined) : `${pct(kpis.dFirstPct)} · depuis le ${fmtDate(first.date)}`} toneClass={tone(kpis.dFirst ?? 0)} />
            )}
            {kpis.dep == null && initial ? (
              <Metric title="Capital initial" value={eur(initial.capital)} sub={`Déposé le ${fmtDate(initial.date)}`} />
            ) : (
              <Metric title={kpis.dep != null ? 'Plus-value vs capital versé' : 'Capital versé'} value={kpis.gain != null ? signed(kpis.gain) : '—'} sub={kpis.gain != null ? `${pct(kpis.gainPct ?? 0)} · versé ${eur(kpis.dep!)}` : 'Renseigne-le dans un relevé pour voir ta plus-value'} toneClass={tone(kpis.gain ?? 0)} />
            )}
          </div>

          <Box title={`Évolution — ${accountName(selected)}`} subtitle={initial ? `Valeur du compte depuis le dépôt initial du ${fmtDate(initial.date)}${hasDeposits ? ' · capital versé en pointillés' : ''}` : hasDeposits ? 'Valeur du compte et capital versé' : 'Valeur du compte à chaque relevé'}>
            {chartData.length > 1 ? (
              <div className="h-[300px]">
                <ValueAreaChart data={chartData} initialCapital={initial?.capital ?? null} />
              </div>
            ) : <Empty text={initial ? 'Ajoute un relevé postérieur au dépôt initial pour voir la courbe.' : 'Ajoute au moins un deuxième relevé pour voir la courbe d’évolution (ou définis le capital initial).'} />}
          </Box>

          {allocation.length > 0 && (
            <div className="grid lg:grid-cols-[1fr_1.6fr] gap-4">
              <Box title="Répartition" subtitle={`Relevé du ${fmtDate(last.date)}`}>
                <div className="h-[240px]">
                  <Donut data={allocation.map(h => ({ name: h.name, value: Number(h.value) }))} centerLabel="Total" />
                </div>
              </Box>
              <Box title="Actifs au dernier relevé" subtitle={prev ? `Variation comparée au relevé du ${fmtDate(prev.date)}` : 'Ajoute un autre relevé pour voir les variations par actif'}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-2.5">Actif</th><th className="text-right">Quantité</th><th className="text-right">Prix</th><th className="text-right">Valeur</th><th className="text-right">%</th><th className="text-right">Δ valeur</th><th className="text-right">Δ prix</th></tr></thead>
                    <tbody>
                      {allocation.map((h, i) => (
                        <tr key={h.id || i} className="border-b border-border/40">
                          <td className="py-2.5"><span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: PALETTE[i % PALETTE.length] }} />{h.name}{h.isNew && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">nouveau</span>}</td>
                          <td className="text-right font-mono text-muted-foreground">{h.quantity != null ? Number(h.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 6 }) : '—'}</td>
                          <td className="text-right font-mono text-muted-foreground">{h.unitPrice != null ? eur(Number(h.unitPrice)) : '—'}</td>
                          <td className="text-right font-mono">{eur(Number(h.value))}</td>
                          <td className="text-right text-muted-foreground">{h.share.toFixed(1)} %</td>
                          <td className={`text-right font-mono ${tone(h.valueDelta ?? 0)}`}>{h.valueDelta == null ? '—' : signed(h.valueDelta)}</td>
                          <td className={`text-right font-mono ${tone(h.priceDelta ?? 0)}`}>{h.priceDelta == null ? '—' : pct(h.priceDelta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Box>
            </div>
          )}

          {assetEvolution.names.length > 0 && list.length > 1 && (
            <Box title="Évolution par actif" subtitle="Valeur de chaque actif à chaque relevé">
              <div className="h-[300px]">
                <MultiLineChart rows={assetEvolution.rows} series={assetEvolution.names.map((n, i) => ({ key: n, color: PALETTE[i % PALETTE.length] }))} />
              </div>
            </Box>
          )}
        </>
      )}

      {/* ───── Historique ───── */}
      {history.length > 0 && (
        <Box title="Historique des relevés" subtitle="Clique sur une ligne pour voir le détail des actifs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground border-b border-border"><th className="w-6" /><th className="text-left py-2.5">Date</th>{selected === 'all' && <th className="text-left">Compte</th>}<th className="text-right">Valeur</th><th className="text-right">Variation</th>{showSince && <th className="text-right">Depuis le dépôt</th>}<th className="text-right">Capital versé</th><th className="text-right">Actifs</th><th /></tr></thead>
              <tbody>
                {history.map(s => {
                  const v = variationOf(s);
                  const isOpen = expanded === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr className="border-b border-border/40 hover:bg-muted/20 cursor-pointer" onClick={() => setExpanded(isOpen ? null : s.id)}>
                        <td className="py-2.5 text-muted-foreground">{s.holdings.length ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}</td>
                        <td className="py-2.5 font-medium">{fmtDate(s.date)}</td>
                        {selected === 'all' && <td>{accountName(s.accountId)}</td>}
                        <td className="text-right font-mono">{eur(Number(s.totalValue))}</td>
                        <td className={`text-right font-mono ${tone(v?.d ?? 0)}`}>{v ? `${signed(v.d)} (${pct(v.p)})` : '—'}</td>
                        {showSince && (() => { const si = sinceInitialOf(s); return <td className={`text-right font-mono ${tone(si?.d ?? 0)}`}>{si ? `${signed(si.d)} (${pct(si.p)})` : '—'}</td>; })()}
                        <td className="text-right font-mono text-muted-foreground">{s.deposited != null ? eur(Number(s.deposited)) : '—'}</td>
                        <td className="text-right text-muted-foreground">{s.holdings.length || '—'}</td>
                        <td className="text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button className="p-1.5 text-muted-foreground hover:text-foreground" title="Modifier" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></button>
                          <button className="p-1.5 text-muted-foreground hover:text-rose-400" title="Supprimer" onClick={() => remove(s)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-muted/10">
                          <td />
                          <td colSpan={(selected === 'all' ? 7 : 6) + (showSince ? 1 : 0)} className="py-3 pr-3">
                            {s.holdings.length ? (
                              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                {s.holdings.map((h, i) => (
                                  <div key={h.id || i} className="rounded-lg border border-border/50 bg-card px-3 py-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0"><p className="font-medium truncate">{h.name}</p><p className="text-[10px] text-muted-foreground">{h.quantity != null && h.unitPrice != null ? `${Number(h.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 6 })} × ${eur(Number(h.unitPrice))}` : h.quantity != null ? `${h.quantity} unités` : h.unitPrice != null ? `Prix ${eur(Number(h.unitPrice))}` : 'Valeur saisie'}</p></div>
                                    <p className="font-mono">{eur(Number(h.value))}</p>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {s.notes && <p className="mt-2 text-[11px] text-muted-foreground flex gap-1.5"><FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />{s.notes}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {selected !== 'all' && initial && (
                  <tr className="border-b border-border/40 bg-amber-500/5">
                    <td />
                    <td className="py-2.5 font-medium">{fmtDate(initial.date)}</td>
                    <td className="text-right font-mono">{eur(initial.capital)}</td>
                    <td colSpan={3 + (showSince ? 1 : 0)} className="pl-4 text-amber-400">Capital initial (dépôt)</td>
                    <td className="text-right"><button className="p-1.5 text-muted-foreground hover:text-foreground" title="Modifier" onClick={openInitial}><Pencil className="h-3.5 w-3.5" /></button></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Box>
      )}

      {/* ───── Dialog capital initial ───── */}
      <Dialog open={initialOpen} onOpenChange={setInitialOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle>Capital initial — {selected !== 'all' ? accountName(selected) : ''}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Indique la somme déposée au départ et la date du dépôt. L’évolution du compte sera calculée à partir de ce point.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Capital initial (€)</Label><Input inputMode="decimal" placeholder="Ex : 10 000" value={initialForm.capital} onChange={e => setInitialForm(f => ({ ...f, capital: e.target.value }))} /></div>
              <div><Label>Date du dépôt</Label><Input type="date" value={initialForm.date} onChange={e => setInitialForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="flex items-center justify-between gap-2">
              {initial ? <Button variant="outline" className="text-rose-400" onClick={clearInitial}>Supprimer</Button> : <span />}
              <div className="flex gap-2"><Button variant="outline" onClick={() => setInitialOpen(false)}>Annuler</Button><Button onClick={saveInitial}>Enregistrer</Button></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───── Dialog relevé ───── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le relevé' : 'Nouveau relevé'}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Compte</Label>
                  <Select value={draft.accountId} onValueChange={v => patchDraft({ accountId: v })}>
                    <SelectTrigger><SelectValue placeholder="Compte" /></SelectTrigger>
                    <SelectContent>{orderedAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date du relevé</Label><Input type="date" value={draft.date} onChange={e => patchDraft({ date: e.target.value })} /></div>
                <div><Label>Capital versé (cumulé)</Label><Input inputMode="decimal" placeholder="Optionnel" value={draft.deposited} onChange={e => patchDraft({ deposited: e.target.value })} /></div>
              </div>

              <div className="rounded-xl border border-border/60 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Actifs du relevé</p>
                    <p className="text-[10px] text-muted-foreground">Quantité × prix donne la valeur automatiquement. Tu peux aussi saisir directement la valeur.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={copyFromPrevious}><Copy className="h-3.5 w-3.5" />Reprendre le dernier relevé</Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => patchDraft({ holdings: [...draft.holdings, emptyHolding()] })}><Plus className="h-3.5 w-3.5" />Actif</Button>
                  </div>
                </div>

                {draft.holdings.length > 0 && (
                  <div className="space-y-2">
                    <div className="hidden sm:grid grid-cols-[1.6fr_0.8fr_0.9fr_1fr_28px] gap-2 text-[10px] text-muted-foreground px-1">
                      <span>Actif / support</span><span>Quantité</span><span>Prix unitaire (€)</span><span>Valeur (€)</span><span />
                    </div>
                    {draft.holdings.map((h, i) => (
                      <div key={h.id} className="grid grid-cols-2 sm:grid-cols-[1.6fr_0.8fr_0.9fr_1fr_28px] gap-2 items-center">
                        <Input className="col-span-2 sm:col-span-1" placeholder="Ex : Fonds euros, ETF MSCI World…" value={h.name} onChange={e => patchHolding(i, { name: e.target.value })} />
                        <Input inputMode="decimal" placeholder="Quantité" value={h.quantity} onChange={e => patchHolding(i, { quantity: e.target.value })} />
                        <Input inputMode="decimal" placeholder="Prix" value={h.unitPrice} onChange={e => patchHolding(i, { unitPrice: e.target.value })} />
                        <Input inputMode="decimal" placeholder="Valeur" value={h.value} onChange={e => patchHolding(i, { value: e.target.value })} />
                        <button type="button" className="p-1 text-muted-foreground hover:text-rose-400 justify-self-end" onClick={() => patchDraft({ holdings: draft.holdings.filter((_, k) => k !== i) })}><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {draft.holdings.length === 0 && (
                  <div>
                    <Label>Valeur totale du compte (€)</Label>
                    <Input inputMode="decimal" placeholder="Si tu ne détailles pas les actifs" value={draft.totalManual} onChange={e => patchDraft({ totalManual: e.target.value })} />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Valeur totale du relevé</span>
                  <span className="font-mono text-lg font-bold">{eur(draftTotal)}</span>
                </div>
              </div>

              <div><Label>Notes</Label><Input placeholder="Optionnel (arbitrage, frais, versement exceptionnel…)" value={draft.notes} onChange={e => patchDraft({ notes: e.target.value })} /></div>

              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <Checkbox checked={draft.applyBalance} onCheckedChange={v => patchDraft({ applyBalance: v === true })} className="mt-0.5" />
                <span>Mettre à jour le solde du compte avec ce relevé<span className="block text-[10px] text-muted-foreground">Le patrimoine de la vue d’ensemble utilisera cette valeur (appliqué seulement si c’est le relevé le plus récent du compte).</span></span>
              </label>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={submit} disabled={saving}>{editing ? 'Enregistrer' : 'Ajouter le relevé'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────── Petits composants ───────────── */
function Box({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {title && <div className="mb-3"><h2 className="text-sm font-semibold">{title}</h2>{subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}</div>}
      {children}
    </section>
  );
}
function Metric({ title, value, sub, toneClass, icon }: { title: string; value: string; sub?: string; toneClass?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{title}</span>{icon && <span className={toneClass}>{icon}</span>}</div>
      <p className={`font-mono text-lg font-bold mt-3 ${toneClass || ''}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="min-h-[120px] flex items-center justify-center text-xs text-muted-foreground text-center">{text}</div>;
}
