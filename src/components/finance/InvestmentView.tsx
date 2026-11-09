import { lazy, Suspense, useMemo, useRef, useState, type ComponentProps } from 'react';
import { FileText, History, Plus, Search, Pencil, Layers, TrendingUp, Upload, Trash2 } from 'lucide-react';
import { StatementsView } from './StatementsView';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { assetDetails, assetKey, isValidIsin, normalizeIsin, investmentAssets, type FinanceAssetProfile } from '@/lib/financeAssets';
import { importStrategyDocument } from '@/lib/strategyDocuments';
import { eur } from './ui';

const AssetPdfDocument = lazy(() => import('./AssetPdfDocument'));

const dateLabel = (date: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR') : '—';
const blankProfile = (name = ''): FinanceAssetProfile => ({ id: '', name, identifier: '', category: '', sector: '', firstInvestedOn: '', thesis: '', notes: '', details: '', isin: '' });

export function InvestmentView(props: ComponentProps<typeof StatementsView>) {
  const { data, upsertRow } = useData();
  const profiles = data.financeAssets;
  const assets = useMemo(() => investmentAssets(props.statements, profiles), [props.statements, profiles]);
  const [tab, setTab] = useState<'statements' | 'assets'>('statements');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<FinanceAssetProfile | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'pdf' | 'history'>('details');
  const [importingPdf, setImportingPdf] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selected = assets.find(asset => asset.id === selectedId);
  const accountName = (id: string) => props.accounts.find(account => account.id === id)?.name ?? 'Compte supprimé';
  const filtered = assets.filter(asset => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    const matchesText = !query || [asset.name, asset.profile?.identifier, asset.profile?.category, asset.profile?.sector, assetDetails(asset.profile)].some(value => value?.toLocaleLowerCase('fr-FR').includes(query));
    const matchesIsin = Boolean(query && asset.isin && asset.isin.includes(normalizeIsin(query)));
    return (matchesText || matchesIsin) && (status === 'all' || (status === 'present' ? asset.present : !asset.present));
  });
  const edit = (asset?: typeof assets[number]) => { setError(''); setSelectedId(null); setEditing({ ...(asset?.profile ?? { ...blankProfile(asset?.name), id: asset?.id ?? '' }), details: assetDetails(asset?.profile), isin: asset?.isin ?? '' }); };
  const openAsset = (id: string) => { setDetailTab('details'); setSelectedId(id); };
  const patch = (field: keyof FinanceAssetProfile, value: string) => setEditing(previous => previous ? { ...previous, [field]: value } : null);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Invest</h1><p className="mt-1 text-sm text-muted-foreground">Tes placements, leur évolution et les actifs de ton parcours.</p></div><div className="page-segments" role="group" aria-label="Vues investissement">{[{ id: 'statements', title: 'Relevés et évolution', Icon: FileText }, { id: 'assets', title: 'Historique des actifs', Icon: History }].map(({ id, title, Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id as typeof tab)} className={`inline-flex h-10 items-center gap-2 px-3 text-xs sm:text-sm ${tab === id ? 'selected-tab' : 'text-muted-foreground'}`}><Icon className="h-4 w-4" />{title}</button>)}</div></header>
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: 'Actifs dans ton historique', value: assets.length, Icon: Layers }, { label: 'Présents aux derniers relevés', value: assets.filter(asset => asset.present).length, Icon: TrendingUp }, { label: 'Relevés enregistrés', value: props.statements.length, Icon: FileText }].map(({ label, value, Icon }) => <div key={label} className="app-panel surface flex items-center gap-3 p-4"><span className="rounded-[10px] bg-primary/10 p-2.5 text-primary"><Icon className="h-4 w-4" /></span><div><p className="text-xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>)}</div>
    {tab === 'statements' ? <StatementsView {...props} /> : <section className="app-panel surface min-w-0 overflow-hidden" aria-label="Historique des actifs investis">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5"><div><h2 className="text-base font-semibold">Tous tes actifs</h2><p className="mt-1 text-xs text-muted-foreground">Retrouvés dans tes relevés, même s’ils n’y figurent plus aujourd’hui.</p></div><Button className="gap-2" onClick={() => edit()}><Plus className="h-4 w-4" />Ajouter un actif</Button></div>
      <div className="flex flex-wrap gap-3 p-4 sm:p-5"><div className="relative min-w-0 flex-1 basis-48"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Rechercher un actif" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nom, ISIN ou détails de l’actif…" className="pl-9" /></div><select aria-label="Filtrer les actifs" value={status} onChange={event => setStatus(event.target.value)} className="h-9 max-w-full rounded-[10px] border border-border/70 bg-background/90 px-3 text-xs"><option value="all">Tous les actifs</option><option value="present">Présents aux derniers relevés</option><option value="past">Hors des derniers relevés</option></select></div>
      {filtered.length === 0 ? <div className="px-5 py-12 text-center text-sm text-muted-foreground">{assets.length ? 'Aucun actif ne correspond à la recherche.' : 'Ajoute un relevé détaillé ou crée une première fiche actif.'}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-secondary/30 text-xs text-muted-foreground"><tr>{['Actif', 'ISIN', 'Première trace', 'Dernière trace', 'Derniers relevés', 'Fiche'].map(title => <th key={title} className="px-5 py-3 font-medium">{title}</th>)}</tr></thead><tbody className="divide-y divide-border/60">{filtered.map(asset => <tr key={asset.id} className="transition-colors hover:bg-secondary/30"><td className="max-w-[280px] px-5 py-4"><button type="button" onClick={() => openAsset(asset.id)} className="max-w-full text-left font-medium underline-offset-4 hover:underline">{asset.name}</button><p className="mt-1 text-xs text-muted-foreground">{[asset.profile?.identifier, asset.profile?.category].filter(Boolean).join(' · ') || (asset.history.length ? `${asset.history.length} observation${asset.history.length > 1 ? 's' : ''}` : 'Fiche manuelle')}</p></td><td className="whitespace-nowrap px-5 py-4 font-mono text-xs">{asset.isin || '—'}</td><td className="whitespace-nowrap px-5 py-4 text-xs">{dateLabel(asset.profile?.firstInvestedOn || asset.history[0]?.date)}</td><td className="whitespace-nowrap px-5 py-4 text-xs">{dateLabel(asset.history.at(-1)?.date)}</td><td className="px-5 py-4"><p className="text-xs font-medium">{asset.present ? eur(asset.currentValue) : '—'}</p><p className="mt-1 text-[11px] text-muted-foreground">{asset.present ? 'Présent' : asset.history.length ? 'Absent des derniers relevés' : 'Sans relevé'}</p></td><td className="px-5 py-4"><Button variant="outline" size="sm" aria-label={`Modifier la fiche ${asset.name}`} onClick={() => edit(asset)}><Pencil className="h-3.5 w-3.5" />Modifier</Button><Button variant="ghost" size="sm" onClick={() => openAsset(asset.id)}>Consulter</Button></td></tr>)}</tbody></table></div>}
    </section>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>{selected && <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">ISIN : {selected.isin || 'Non renseigné'}</p><Button variant="outline" size="sm" onClick={() => edit(selected)}>Modifier la fiche</Button></div>
      <div className="page-segments" role="group" aria-label="Consultation de l’actif">{([{ id: 'details', title: 'Détails' }, ...(selected.profile?.pdf ? [{ id: 'pdf', title: 'Fiche PDF' }] : []), { id: 'history', title: 'Historique' }] as const).map(item => <button key={item.id} type="button" aria-pressed={detailTab === item.id} onClick={() => setDetailTab(item.id as typeof detailTab)} className={`h-9 px-3 text-sm ${detailTab === item.id ? 'selected-tab' : 'text-muted-foreground'}`}>{item.title}</button>)}</div>
      {detailTab === 'pdf' && selected.profile?.pdf && <Suspense fallback={<p role="status" className="py-8 text-sm text-muted-foreground">Ouverture du PDF…</p>}><AssetPdfDocument pdf={selected.profile.pdf} /></Suspense>}
      {detailTab === 'details' && (<div className="rounded-xl border border-border/60 p-4"><h3 className="mb-3 text-sm font-semibold">Détails</h3><p className="min-h-40 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{assetDetails(selected.profile) || 'Aucun détail renseigné.'}</p></div>)}
      {detailTab === 'history' && (<div><h3 className="mb-3 text-sm font-semibold">Historique dans les relevés</h3>{selected.history.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr>{['Date', 'Compte', 'Quantité', 'Valeur relevée'].map(title => <th key={title} className="whitespace-nowrap border-b border-border px-2 py-3 font-medium">{title}</th>)}</tr></thead><tbody>{[...selected.history].reverse().map(point => <tr key={`${point.statementId}-${point.accountId}`}><td className="whitespace-nowrap px-2 py-3">{dateLabel(point.date)}</td><td className="px-2 py-3">{accountName(point.accountId)}</td><td className="px-2 py-3">{point.quantity?.toLocaleString('fr-FR') ?? '—'}</td><td className="whitespace-nowrap px-2 py-3">{eur(point.value)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Cette fiche n’a pas encore d’observation dans les relevés.</p>}<p className="mt-3 text-[11px] text-muted-foreground">Les dates correspondent aux relevés enregistrés. Une absence ne confirme pas une vente.</p></div>)}
    </div>}</DialogContent></Dialog>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !saving && !importingPdf) setEditing(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing?.id ? 'Fiche actif' : 'Ajouter un actif'}</DialogTitle></DialogHeader>{editing && <form onSubmit={async event => {
      event.preventDefault(); if (saving || importingPdf) return;
      const name = editing.name.trim(); if (!name) return;
      const id = editing.id || assetKey(name);
      if (!editing.id && profiles.some(profile => profile.id === id)) { setError('Une fiche existe déjà pour cet actif. Retrouvez-la dans la liste.'); return; }
      const isin = normalizeIsin(editing.isin ?? '');
      if (isin && !isValidIsin(isin)) { setError('ISIN invalide : vérifiez les 12 caractères et le code de contrôle.'); return; }
      setSaving(true); setError('');
      try { await upsertRow('financeAssets', { ...editing, id, name, isin }, 'id'); setEditing(null); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer la fiche.'); }
      finally { setSaving(false); }
    }}><fieldset disabled={saving || importingPdf} className="space-y-4"><div><Label htmlFor="asset-name">Nom de l’actif</Label><Input id="asset-name" required readOnly={Boolean(editing.id)} value={editing.name} onChange={event => patch('name', event.target.value)} /></div><div><Label htmlFor="asset-isin">ISIN</Label><Input id="asset-isin" value={editing.isin ?? ''} onChange={event => patch('isin', normalizeIsin(event.target.value))} placeholder="12 caractères" maxLength={12} autoComplete="off" spellCheck={false} className="font-mono" /></div><div><Label htmlFor="asset-details">Détails</Label><Textarea id="asset-details" value={editing.details ?? ''} onChange={event => patch('details', event.target.value)} className="min-h-[320px] resize-y leading-relaxed" /></div><div className="space-y-3 rounded-xl border border-border/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Label>Fiche PDF</Label><Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => pdfInput.current?.click()}><Upload className="h-4 w-4" />{importingPdf ? 'Import en cours…' : editing.pdf ? 'Remplacer le PDF' : 'Ajouter un PDF'}</Button></div><input ref={pdfInput} type="file" accept=".pdf,application/pdf" aria-label="Importer une fiche PDF" className="sr-only" tabIndex={-1} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      setImportingPdf(true); setError('');
      try {
        if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Choisissez une fiche au format PDF.');
        const document = await importStrategyDocument(file);
        setEditing(previous => previous ? { ...previous, pdf: { name: document.name, size: document.size, content: document.content } } : null);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’importer le PDF.'); }
      finally { setImportingPdf(false); }
    }} />{editing.pdf ? <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-xs">{editing.pdf.name} · {Math.max(1, Math.round(editing.pdf.size / 1024))} Ko</span><Button type="button" variant="ghost" size="icon" aria-label="Retirer la fiche PDF" onClick={() => setEditing(previous => previous ? { ...previous, pdf: undefined } : null)}><Trash2 className="h-4 w-4" /></Button></div> : <p className="text-xs text-muted-foreground">Le document sera consultable directement dans la fiche.</p>}</div>{error && <p role="alert" className="text-sm text-loss">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit">{saving ? 'Enregistrement…' : 'Enregistrer la fiche'}</Button></div></fieldset></form>}</DialogContent></Dialog>
  </div>;
}
