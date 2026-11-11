import DashboardFilter from '@/components/trading/DashboardFilter';
import { Input } from '@/components/ui/input';
import type { Account } from '@/types/account';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { BookOpen, Download, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { htmlFrame } from '@/lib/htmlDocument';
import { importStrategyDocument, documentBuffer, wordPreview, wordFrame, type StrategyDocument } from '@/lib/strategyDocuments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const StrategyPdfViewer = lazy(() => import('@/components/trading/StrategyPdfViewer'));

export default function Strategy({ accounts, activeAccountId, onSelectAccount }: {accounts:Account[]; activeAccountId:string | null; onSelectAccount:(id:string)=>void}) {
  const { data, addRow, deleteRow } = useData();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [order, setOrder] = useState('recent');
  const documents = data.strategyDocuments.filter(document => (!document.accountId || activeAccountId === 'all' || document.accountId === activeAccountId) && (kind === 'all' || document.kind === kind) && document.name.toLocaleLowerCase('fr-FR').includes(query.trim().toLocaleLowerCase('fr-FR'))).sort((a,b) => order === 'name' ? a.name.localeCompare(b.name,'fr') : b.createdAt.localeCompare(a.createdAt));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = documents.find(document => document.id === selectedId) || documents[0];
  const [preview, setPreview] = useState<{ id: string; url: string; html?: string } | null>(null);
  const [readingError, setReadingError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<StrategyDocument | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(null);
    setReadingError('');
    if (!selected) return;
    let cancelled = false;
    let url: string | undefined;
    (async () => {
      try {
        const buffer = documentBuffer(selected.content);
        url = URL.createObjectURL(new Blob([buffer], { type: selected.kind === 'pdf' ? 'application/pdf' : selected.kind === 'html' ? 'text/html' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        const html = selected.kind === 'docx' ? wordFrame(await wordPreview(buffer)) : selected.kind === 'html' ? await htmlFrame(new TextDecoder().decode(buffer)) : undefined;
        if (!cancelled) setPreview({ id: selected.id, url, html });
      } catch {
        if (!cancelled) setReadingError('Impossible d’afficher ce document. Réimportez le fichier original.');
      }
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [selected]);

  const importFile = async (file?: File) => {
    if (!file || busy) return;
    setBusy(true); setError('');
    try {
      const document = await importStrategyDocument(file);
      await addRow('strategyDocuments', {...document, ...(activeAccountId && activeAccountId !== 'all' ? {accountId:activeAccountId} : {})});
      setKind('all'); setQuery(''); setSelectedId(document.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le document.');
    } finally { setBusy(false); }
  };

  const removeDocument = async () => {
    if (!removing) return;
    setBusy(true); setError('');
    try { await deleteRow('strategyDocuments', removing.id); setRemoving(null); }
    catch { setError('Impossible de supprimer le document.'); }
    finally { setBusy(false); }
  };

  const currentPreview = preview?.id === selected?.id ? preview : null;

  return (
    <div className="strategy-page mx-auto w-full space-y-8 pb-10">
      <header className="flex flex-wrap items-center justify-end gap-4">
        <h1 className="sr-only page-title-hidden">Stratégie</h1>
        <Button className="gap-2 rounded-xl" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Importer un document
        </Button>
        <input ref={input} type="file" accept=".html,.htm,text/html,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Importer un document de stratégie" className="sr-only" tabIndex={-1} disabled={busy} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
      </header>
      <div className="dashboard-filter-controls"><DashboardFilter label="Compte" ariaLabel="Compte des stratégies" disabled={busy} value={activeAccountId ?? 'all'} onChange={onSelectAccount} options={[{value:'all',label:'Tous les comptes'},...accounts.map(account=>({value:account.id,label:account.name}))]}/><DashboardFilter label="Format" ariaLabel="Format des documents" disabled={busy} value={kind} onChange={setKind} options={[{value:'all',label:'Tous les formats'},{value:'pdf',label:'PDF'},{value:'docx',label:'Word'},{value:'html',label:'HTML'}]}/><DashboardFilter label="Trier" ariaLabel="Tri des documents" disabled={busy} value={order} onChange={setOrder} options={[{value:'recent',label:'Plus récents'},{value:'name',label:'Nom du document'}]}/><div className="min-w-0 flex-1 basis-48"><label htmlFor="strategy-search" className="dashboard-filter-caption">Recherche</label><Input id="strategy-search" placeholder="Nom du document…" value={query} onChange={event=>setQuery(event.target.value)} className="h-[42px] rounded-[10px] bg-transparent text-xs"/></div></div>
      {error && <p role="alert" className="rounded-xl border border-loss/20 bg-loss/5 p-3 text-sm text-loss">{error}</p>}
      {!documents.length ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" strokeWidth={1.4} />
          <div><h2 className="text-lg font-semibold">Aucun document dans cette sélection</h2><p className="mt-2 text-sm text-muted-foreground">PDF, Word (.docx) ou HTML</p></div>
          <Button variant="outline" className="rounded-xl" disabled={busy} onClick={() => input.current?.click()}>Choisir un fichier</Button>
        </div>
      ) : (
        <div className="ui-reading-divider grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Documents de stratégie" className="reports-period-list min-w-0 lg:sticky lg:top-6">
            {documents.map(document => <button key={document.id} type="button" aria-current={selected?.id === document.id ? 'true' : undefined} onClick={() => setSelectedId(document.id)} aria-pressed={selected?.id === document.id} className="reports-period-item flex min-w-0 items-center gap-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium" title={document.name}>{document.name}</span><span className="mt-1 block text-xs text-muted-foreground">{document.kind === 'pdf' ? 'PDF' : document.kind === 'html' ? 'HTML' : 'Word'} · {document.accountId ? accounts.find(account=>account.id===document.accountId)?.name ?? 'Compte supprimé' : 'Commun'}</span></span>
            </button>)}
          </nav>
          <section aria-label="Lecteur de stratégie" className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
              <h2 className="min-w-0 max-w-full truncate text-sm font-medium">{selected?.name}</h2>
              <div className="flex items-center gap-2">
                {currentPreview && <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-lg"><a href={currentPreview.url} download={selected.name}><Download className="h-3.5 w-3.5" />Télécharger</a></Button>}
                <Button variant="ghost" size="icon" aria-label="Supprimer le document" disabled={busy} onClick={() => setRemoving(selected)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            </div>
            {readingError ? <p role="alert" className="p-8 text-sm text-loss">{readingError}</p> : currentPreview ? (
              currentPreview.html !== undefined
                ? <iframe title={`Document de stratégie ${selected.kind === 'html' ? 'HTML' : 'Word'}`} srcDoc={currentPreview.html} sandbox={selected.kind === 'html' ? 'allow-scripts' : ''} referrerPolicy="no-referrer" className="block h-[75dvh] min-h-[500px] w-full bg-white" />
                : <Suspense fallback={<div role="status" className="p-8 text-sm text-muted-foreground">Ouverture du PDF…</div>}><StrategyPdfViewer key={selected.id} content={selected.content} /></Suspense>
            ) : <div role="status" className="flex min-h-[500px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Ouverture du document…</div>}
          </section>
        </div>
      )}
      <AlertDialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle><AlertDialogDescription>{removing?.name}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void removeDocument(); }}>Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
