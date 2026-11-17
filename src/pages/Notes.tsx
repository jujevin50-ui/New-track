import { useState, type FormEvent } from 'react';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import type { Note } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';

function readScreenshot(file: File): Promise<Note['screenshots'][number]> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('Choisissez des images PNG, JPEG, WebP ou GIF.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Chaque capture doit faire moins de 5 Mo.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire la capture.'));
    reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, content: String(reader.result) });
    reader.readAsDataURL(file);
  });
}

export default function Notes() {
  const { data, upsertRow, deleteRow } = useData();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Note | null>(null);
  const [removing, setRemoving] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notes = data.notes.filter(note => `${note.title} ${note.explanations}`.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const report = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Impossible de sauvegarder la note.');
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.title.trim() || busy) return;
    setBusy(true); setError('');
    try {
      await upsertRow('notes', { ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() }, 'id');
      setDraft(null);
    } catch (cause) { report(cause); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto w-full space-y-6 pb-10">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl font-semibold">Notes</h1><p className="mt-1 text-sm text-muted-foreground">Vos idées, analyses et captures de trading.</p></div>
      <Button className="gap-2 rounded-xl" onClick={() => { setError(''); const now = new Date().toISOString(); setDraft({ id: crypto.randomUUID(), title: '', explanations: '', screenshots: [], createdAt: now, updatedAt: now }); }}><Plus className="h-4 w-4" />Nouvelle note</Button>
    </header>
    <div><label htmlFor="notes-search" className="sr-only">Rechercher des notes</label><Input id="notes-search" placeholder="Rechercher dans les titres et les explications…" value={query} onChange={event => setQuery(event.target.value)} className="rounded-xl" /></div>
    {error && !draft && !removing && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!notes.length ? <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"><BookOpen className="h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">{query ? 'Aucune note ne correspond à cette recherche.' : 'Créez votre première note.'}</p></div> : <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {notes.map(note => <article key={note.id} className="min-w-0 rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="break-words text-lg font-semibold">{note.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">Modifiée le {new Date(note.updatedAt).toLocaleDateString('fr-FR')}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm">{note.explanations}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">{note.screenshots.map(image => <a key={image.id} href={image.content} download={image.name} aria-label={`Télécharger ${image.name}`}><img src={image.content} alt={image.name} className="aspect-video w-full rounded-lg border border-border object-contain" /></a>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" className="gap-2" onClick={() => { setError(''); setDraft({ ...note, screenshots: [...note.screenshots] }); }}><Pencil className="h-4 w-4" />Modifier</Button><Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => { setError(''); setRemoving(note); }}><Trash2 className="h-4 w-4" />Supprimer</Button></div>
      </article>)}
    </div>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) setDraft(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{data.notes.some(note => note.id === draft?.id) ? 'Modifier la note' : 'Nouvelle note'}</DialogTitle><DialogDescription>Ajoutez vos explications et plusieurs captures. Les notes utilisent votre sauvegarde actuelle.</DialogDescription></DialogHeader>
        {draft && <form onSubmit={save} className="min-w-0 space-y-4">
          <div><label htmlFor="note-title" className="text-sm">Titre</label><Input id="note-title" required value={draft.title} disabled={busy} onChange={event => setDraft({ ...draft, title: event.target.value })} /></div>
          <div><label htmlFor="note-explanations" className="text-sm">Explications</label><Textarea id="note-explanations" rows={7} value={draft.explanations} disabled={busy} onChange={event => setDraft({ ...draft, explanations: event.target.value })} /></div>
          <div><label htmlFor="note-images" className="text-sm">Ajouter des captures (5 Mo maximum par image)</label><Input id="note-images" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={async event => {
            const files = Array.from(event.target.files ?? []); event.target.value = ''; setError(''); setBusy(true);
            try { const images = await Promise.all(files.map(readScreenshot)); setDraft(current => current ? { ...current, screenshots: [...current.screenshots, ...images] } : current); }
            catch (cause) { report(cause); } finally { setBusy(false); }
          }} /></div>
          <div className="grid grid-cols-2 gap-3">{draft.screenshots.map(image => <div key={image.id} className="min-w-0"><img src={image.content} alt={image.name} className="aspect-video w-full rounded-lg object-contain" /><Button type="button" variant="ghost" size="sm" disabled={busy} className="h-auto w-full whitespace-normal break-all" onClick={() => setDraft({ ...draft, screenshots: draft.screenshots.filter(item => item.id !== image.id) })}>Retirer {image.name}</Button></div>)}</div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>Annuler</Button><Button type="submit" disabled={busy || !draft.title.trim()}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle><AlertDialogDescription>La note « {removing?.title} » et ses captures seront supprimées définitivement.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel><Button variant="destructive" disabled={busy} onClick={async () => { if (!removing) return; setBusy(true); setError(''); try { await deleteRow('notes', removing.id); setRemoving(null); } catch (cause) { report(cause); } finally { setBusy(false); } }}>Confirmer la suppression</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
