import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { documentBuffer } from '@/lib/strategyDocuments';
import { Button } from '@/components/ui/button';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function StrategyPdfViewer({ content, label = 'Document de stratégie PDF' }: { content: string; label?: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPdf(null); setError(''); setPageNumber(1); setZoom(1);
    const task = getDocument({ data: new Uint8Array(documentBuffer(content)) });
    task.promise.then(document => { if (!cancelled) setPdf(document); }).catch(() => {
      if (!cancelled) setError('Impossible de lire ce PDF. Vérifiez le fichier original.');
    });
    return () => { cancelled = true; void task.destroy(); };
  }, [content]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0].contentRect.width - 32)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !width || !canvas.current) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    const target = canvas.current;
    setRendering(true); setText(''); setError('');
    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * zoom });
        // Suréchantillonnage pour garder les petits caractères nets, sans dépasser
        // un budget de 16 millions de pixels pour les pages très grandes.
        const desiredRatio = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
        const ratio = Math.min(desiredRatio, Math.sqrt(16_000_000 / (viewport.width * viewport.height)));
        target.width = Math.ceil(viewport.width * ratio);
        target.height = Math.ceil(viewport.height * ratio);
        target.style.width = `${viewport.width}px`;
        target.style.height = `${viewport.height}px`;
        task = page.render({ canvas: target, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        await task.promise;
        const extracted = await page.getTextContent();
        if (!cancelled) {
          setText(extracted.items.flatMap(item => 'str' in item ? [item.str] : []).join(' '));
          setRendering(false);
        }
      } catch {
        if (!cancelled) { setError('Impossible d’afficher cette page du PDF.'); setRendering(false); }
      }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, pageNumber, width, zoom]);

  return (
    <div className="flex h-[75dvh] min-h-[500px] flex-col" aria-label={label}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Page précédente" disabled={!pdf || pageNumber === 1} onClick={() => setPageNumber(number => number - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-12 text-center text-xs tabular-nums" aria-live="polite">{pageNumber} / {pdf?.numPages || '—'}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Page suivante" disabled={!pdf || pageNumber === pdf.numPages} onClick={() => setPageNumber(number => number + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Réduire le zoom" disabled={!pdf || zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.25))}><Minus className="h-3.5 w-3.5" /></Button>
          <span className="min-w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)} %</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Augmenter le zoom" disabled={!pdf || zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + 0.25))}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div ref={container} className="relative min-h-0 flex-1 overflow-auto bg-secondary/60 p-4">
        {error ? <p role="alert" className="p-4 text-sm text-loss">{error}</p> : <>
          {(!pdf || rendering) && <div role="status" className="absolute inset-x-0 top-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement de la page…</div>}
          <canvas ref={canvas} className={`mx-auto block bg-white shadow-sm ${rendering || !pdf ? 'invisible' : ''}`} role="img" aria-label={`Page ${pageNumber} du document PDF`} />
          <p className="sr-only">{text}</p>
        </>}
      </div>
    </div>
  );
}
