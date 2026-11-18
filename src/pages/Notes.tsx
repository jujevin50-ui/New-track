import { useSaveConfirmation } from '@/hooks/useSaveConfirmation';
import { format } from 'date-fns';
import { useRef, useState, type FormEvent } from 'react';
import { BookOpen, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, ImagePlus } from 'lucide-react';
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
  const [reading, setReading] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ images: Note['screenshots']; index: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const importing = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Note | null>(null);
  const [removing, setRemoving] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const { saved, confirm } = useSaveConfirmation();
  const [error, setError] = useState('');
  const notes = data.notes.filter(note => `${note.title} ${note.explanations}`.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const report = (cause: unknown) => setError(cause instanceof Error ? cause.message : 'Impossible de sauvegarder la note.');
  const selected = data.notes.find(note => note.id === reading);
  const preview = (images: Note['screenshots'], index: number) => { setZoomed(false); setViewer({ images, index }); };
  const addImages = async (files: File[]) => {
    if (!files.length || importing.current || busy || saved) return;
    importing.current = true; setBusy(true); setError('');
    try {
      const images = await Promise.all(files.map(readScreenshot));
      setDraft(current => current ? { ...current, screenshots: [...current.screenshots, ...images] } : current);
    } catch (cause) { report(cause); }
    finally { importing.current = false; setBusy(false); }
  };
  const edit = (note: Note) => { setReading(null); setError(''); setDraft({ ...note, screenshots: [...note.screenshots] }); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.title.trim() || busy || saved) return;
    setBusy(true); setError('');
    try {
      await upsertRow('notes', { ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() }, 'id');
      confirm(() => setDraft(null));
    } catch (cause) { report(cause); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto w-full space-y-6 pb-10">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl font-semibold">Notes</h1><p className="mt-1 text-sm text-muted-foreground">Vos idées, analyses et captures de trading.</p></div>
      <Button className="gap-2 rounded-xl" onClick={() => { setError(''); const now = new Date().toISOString(); setDraft({ id: crypto.randomUUID(), title: '', date: format(new Date(), 'yyyy-MM-dd'), explanations: '', screenshots: [], createdAt: now, updatedAt: now }); }}><Plus className="h-4 w-4" />Nouvelle note</Button>
    </header>
    <div><label htmlFor="notes-search" className="sr-only">Rechercher des notes</label><Input id="notes-search" placeholder="Rechercher dans les titres et les explications…" value={query} onChange={event => setQuery(event.target.value)} className="rounded-xl" /></div>
    {error && !draft && !removing && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!notes.length ? <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"><BookOpen className="h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">{query ? 'Aucune note ne correspond à cette recherche.' : 'Créez votre première note.'}</p></div> : <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {notes.map(note => <article key={note.id} className="min-w-0 rounded-2xl border border-border bg-card/60 p-5">
        <h2 className="break-words text-lg font-semibold"><button type="button" className="text-left hover:text-primary focus-visible:outline focus-visible:outline-2 rounded" onClick={() => setReading(note.id)}>{note.title}</button></h2>
        <p className="mt-1 text-xs text-muted-foreground">{note.date && <><time dateTime={note.date}>{format(new Date(`${note.date}T12:00:00`), 'dd/MM/yyyy')}</time> · </>}Modifiée le {new Date(note.updatedAt).toLocaleDateString('fr-FR')}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm">{note.explanations}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">{note.screenshots.map(image => <button type="button" key={image.id} onClick={() => preview(note.screenshots, note.screenshots.indexOf(image))} aria-label={`Agrandir ${image.name}`} className="rounded-lg focus-visible:ring-2 ring-primary hover:opacity-80"><img src={image.content} alt={image.name} className="aspect-video w-full rounded-lg border border-border object-contain" /></button>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={() => setReading(note.id)}>Lire</Button><Button variant="outline" size="sm" className="gap-2" onClick={() => edit(note)}><Pencil className="h-4 w-4" />Modifier</Button><Button variant="ghost" size="sm" className="gap-2 text-destructive" onClick={() => { setError(''); setRemoving(note); }}><Trash2 className="h-4 w-4" />Supprimer</Button></div>
      </article>)}
    </div>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy && !saved) setDraft(null); }}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{data.notes.some(note => note.id === draft?.id) ? 'Modifier la note' : 'Nouvelle note'}</DialogTitle><DialogDescription>Écrivez votre note et collez vos captures avec Ctrl+V ou ⌘V. Cliquez sur une image pour l’agrandir.</DialogDescription></DialogHeader>
        {draft && <form onSubmit={save} className="min-w-0 space-y-4" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); event.currentTarget.requestSubmit(); } }} onPaste={event => {
            const images = Array.from(event.clipboardData.items).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => file !== null);
            if (images.length) { event.preventDefault(); void addImages(images); }
          }}>
          <div><label htmlFor="note-title" className="text-sm">Titre</label><Input id="note-title" autoFocus required value={draft.title} disabled={busy || saved} onChange={event => setDraft({ ...draft, title: event.target.value })} /></div>
          <div className="sm:max-w-xs"><label htmlFor="note-date" className="text-sm">Date de la note</label><Input id="note-date" type="date" value={draft.date ?? ''} disabled={busy || saved} onChange={event => setDraft({ ...draft, date: event.target.value })} /></div>
          <div><label htmlFor="note-explanations" className="text-sm">Explications</label><Textarea id="note-explanations" rows={7} value={draft.explanations} disabled={busy || saved} onChange={event => setDraft({ ...draft, explanations: event.target.value })} /></div>
          <div tabIndex={0} role="group" aria-label="Zone de captures : coller ou déposer des images" className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); void addImages(Array.from(event.dataTransfer.files)); }}>
            <ImagePlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Collez ou glissez vos captures ici</p>
            <p className="mt-1 text-xs text-muted-foreground">Ctrl+V / ⌘V dans la note · PNG, JPEG, WebP, GIF · 5 Mo par image</p>
            <Button type="button" variant="outline" className="mt-3" disabled={busy || saved} onClick={() => fileInput.current?.click()}>Choisir des images</Button>
            <label htmlFor="note-images" className="sr-only">Ajouter des captures (5 Mo maximum par image)</label>
            <input ref={fileInput} id="note-images" className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy || saved} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void addImages(files); }} />
          </div>
          {draft.screenshots.length > 0 && <p className="text-sm text-muted-foreground">{draft.screenshots.length} capture{draft.screenshots.length > 1 ? 's' : ''} · Cliquez pour agrandir</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{draft.screenshots.map((image, index) => <div key={image.id} className="min-w-0 rounded-xl border border-border p-2"><button type="button" className="block w-full rounded-lg focus-visible:ring-2 ring-primary" aria-label={`Agrandir ${image.name}`} onClick={() => preview(draft.screenshots, index)}><img src={image.content} alt={image.name} className="aspect-video w-full rounded-lg bg-muted/30 object-contain" /></button><Button type="button" variant="ghost" size="sm" disabled={busy || saved} className="mt-1 h-auto w-full whitespace-normal break-all text-destructive" onClick={() => setDraft({ ...draft, screenshots: draft.screenshots.filter(item => item.id !== image.id) })}>Retirer {image.name}</Button></div>)}</div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="sticky -bottom-6 z-10 flex justify-end gap-2 border-t border-border bg-background py-4"><Button type="button" variant="outline" disabled={busy || saved} onClick={() => setDraft(null)}>Annuler</Button><Button type="submit" loading={busy} saved={saved} disabled={saved || !draft.title.trim()}>{saved ? 'Enregistré' : 'Enregistrer'}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setReading(null); }}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle className="break-words pr-6">{selected?.title}</DialogTitle><DialogDescription>Votre note et toutes ses captures.</DialogDescription></DialogHeader>
        {selected && <>{selected.date && <p className="text-sm text-muted-foreground">Date de la note : <time dateTime={selected.date}>{format(new Date(`${selected.date}T12:00:00`), 'dd/MM/yyyy')}</time></p>}<p className="whitespace-pre-wrap break-words leading-relaxed">{selected.explanations || 'Aucune explication.'}</p><div className="grid gap-4 sm:grid-cols-2">{selected.screenshots.map((image, index) => <button key={image.id} type="button" className="min-w-0 rounded-xl border border-border bg-muted/20 p-2 focus-visible:ring-2 ring-primary" aria-label={`Agrandir ${image.name}`} onClick={() => preview(selected.screenshots, index)}><img src={image.content} alt={image.name} className="max-h-64 w-full rounded-lg object-contain" /><span className="mt-2 block truncate text-xs text-muted-foreground">{image.name} · Agrandir</span></button>)}</div><div className="sticky -bottom-6 border-t border-border bg-background py-4"><Button className="gap-2" onClick={() => edit(selected)}><Pencil className="h-4 w-4" />Modifier la note</Button></div></>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!viewer} onOpenChange={open => { if (!open) setViewer(null); }}>
      <DialogContent className="flex h-[92dvh] max-w-[96vw] flex-col gap-3 sm:max-w-[96vw]" onKeyDown={event => {
        if (!viewer || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault(); setZoomed(false); setViewer({ ...viewer, index: (viewer.index + (event.key === 'ArrowRight' ? 1 : -1) + viewer.images.length) % viewer.images.length });
      }}>
        <DialogHeader className="min-w-0 pr-8"><DialogTitle className="truncate">{viewer?.images[viewer.index]?.name}</DialogTitle><DialogDescription>Capture {viewer ? viewer.index + 1 : 0} sur {viewer?.images.length} · Flèches pour naviguer, Échap pour fermer.</DialogDescription></DialogHeader>
        {viewer && <><div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-xl bg-muted/30"><img src={viewer.images[viewer.index].content} alt={viewer.images[viewer.index].name} className={zoomed ? 'm-auto max-w-none shrink-0' : 'h-full w-full object-contain'} /></div><div className="flex flex-wrap items-center justify-center gap-2"><Button type="button" variant="outline" size="icon" aria-label="Image précédente" disabled={viewer.images.length < 2} onClick={() => { setZoomed(false); setViewer({ ...viewer, index: (viewer.index - 1 + viewer.images.length) % viewer.images.length }); }}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" className="gap-2" onClick={() => setZoomed(!zoomed)}>{zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}{zoomed ? 'Ajuster' : 'Taille réelle'}</Button><Button asChild variant="outline" size="icon"><a href={viewer.images[viewer.index].content} download={viewer.images[viewer.index].name} aria-label="Télécharger l’image"><Download className="h-4 w-4" /></a></Button><Button type="button" variant="outline" size="icon" aria-label="Image suivante" disabled={viewer.images.length < 2} onClick={() => { setZoomed(false); setViewer({ ...viewer, index: (viewer.index + 1) % viewer.images.length }); }}><ChevronRight className="h-4 w-4" /></Button></div></>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle><AlertDialogDescription>La note « {removing?.title} » et ses captures seront supprimées définitivement.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy || saved}>Annuler</AlertDialogCancel><Button variant="destructive" disabled={busy || saved} onClick={async () => { if (!removing) return; setBusy(true); setError(''); try { await deleteRow('notes', removing.id); setRemoving(null); } catch (cause) { report(cause); } finally { setBusy(false); } }}>Confirmer la suppression</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
