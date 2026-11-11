import DashboardFilter from '@/components/trading/DashboardFilter';
import { Segmented } from './ui';
import { lazy, Suspense, useMemo, useRef, useState, type ComponentProps } from 'react';
import { FileText, Plus, Search, Pencil, Upload, Trash2, ChevronRight } from 'lucide-react';
import InvestmentOverview from './InvestmentOverview';
import { investmentColor } from './investmentColors';
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
  const [tab, setTab] = useState<'statements' | 'assets'>(props.initialAccountId ? 'statements' : 'assets');
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
    <div className="finance-invest-header"><h1 className="text-xl font-semibold tracking-tight">Invest</h1><Button className="gap-2" onClick={() => edit()}><Plus className="h-4 w-4" />Ajouter un actif</Button></div>
    <div className="finance-toolbar"><div className="dashboard-filter-controls"><DashboardFilter label="Compte" ariaLabel="Compte Finance" value={props.selectedAccountId ?? 'all'} onChange={props.onAccountChange ?? (() => {})} options={[{value:'all',label:'Tous les comptes'},...props.accounts.map(account=>({value:account.id,label:account.name}))]} /></div><Segmented<'assets' | 'statements'> value={tab} onChange={setTab} options={[[ 'assets','Actifs'],['statements','Relevés et évolution']]} /></div>
    {tab === 'assets' && <InvestmentOverview assets={assets} lastDate={props.statements.map(statement => statement.date).sort().at(-1)} onSelect={openAsset} />}
    {tab === 'statements' ? <StatementsView {...props} /> : <section className="app-panel surface min-w-0 overflow-hidden" aria-label="Historique des actifs investis">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5"><div><h2 className="text-base font-semibold">Mes actifs <span className="ml-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{filtered.length}</span></h2></div></div>
      <div className="finance-list-filters dashboard-filter-controls"><div className="relative min-w-0 flex-1 basis-48"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Rechercher un actif" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nom, ISIN ou détails de l’actif…" className="h-[42px] pl-9" /></div><DashboardFilter label="Présence" ariaLabel="Filtrer les actifs" value={status} onChange={setStatus} options={[{value:'all',label:'Tous les actifs'},{value:'present',label:'En portefeuille'},{value:'past',label:'Historique'}]} /></div>
      {filtered.length === 0 ? <div className="px-5 py-12 text-center text-sm text-muted-foreground">{assets.length ? 'Aucun actif ne correspond à la recherche.' : 'Ajoute un relevé détaillé ou crée une première fiche actif.'}</div> : <div role="list" aria-label="Liste des actifs" className="divide-y divide-border/50">{filtered.map(asset => <div key={asset.id} role="listitem" onClick={event => { if (event.target instanceof Element && event.target.closest('button')) return; openAsset(asset.id); }} className="group flex items-stretch transition-colors hover:bg-primary/5 focus-within:bg-primary/5">
        <button type="button" aria-label={`Consulter ${asset.name}`} onClick={() => openAsset(asset.id)} className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold" style={{ color: investmentColor(asset.id), background: `color-mix(in srgb, ${investmentColor(asset.id)} 12%, transparent)` }}>{asset.name.slice(0, 2).toLocaleUpperCase('fr-FR')}</span><span className="min-w-0"><span className="block break-words text-sm font-semibold">{asset.name}</span><span className="mt-1 block break-all font-mono text-[10px] text-muted-foreground">{asset.isin || 'ISIN non renseigné'}</span></span></span>
          <span className="text-right md:text-left"><span className="block whitespace-nowrap text-sm font-semibold tabular-nums">{asset.present ? eur(asset.currentValue) : '—'}</span><span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${asset.present ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : asset.history.length ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-secondary text-muted-foreground'}`}>{asset.present ? 'En portefeuille' : asset.history.length ? 'Historique' : 'Fiche manuelle'}</span></span>
          <span className="col-span-2 flex flex-wrap items-center justify-between gap-2 pl-[52px] md:col-span-1 md:justify-start md:pl-0"><span className="text-[10px] text-muted-foreground">{asset.history.length ? `Dernier relevé · ${dateLabel(asset.history.at(-1)?.date)}` : 'Aucun relevé associé'}</span>{asset.profile?.pdf && <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-400"><FileText className="h-3 w-3" />PDF</span>}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1 pr-3 sm:pr-5"><Button variant="ghost" size="icon" aria-label={`Modifier la fiche ${asset.name}`} onClick={() => edit(asset)} className="h-8 w-8 text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></Button><ChevronRight className="hidden h-4 w-4 text-muted-foreground/50 sm:block" /></div>
      </div>)}</div>}

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
