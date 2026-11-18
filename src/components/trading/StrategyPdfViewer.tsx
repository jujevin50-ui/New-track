import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { documentBuffer, PDF_MIN_ZOOM, PDF_MAX_ZOOM } from '@/lib/strategyDocuments';
import { Button } from '@/components/ui/button';

GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  content: string;
  label?: string;
  initialZoom?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  continuous?: boolean;
}

export default function StrategyPdfViewer({ content, label = 'Document de stratégie PDF', initialZoom = 1, zoom: controlledZoom, onZoomChange, continuous = false }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [internalZoom, setInternalZoom] = useState(initialZoom);
  const zoom = controlledZoom ?? internalZoom;
  const [width, setWidth] = useState(0);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);

  const changeZoom = (step: number) => {
    const nextZoom = Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, zoom + step));
    if (onZoomChange) onZoomChange(nextZoom);
    else setInternalZoom(nextZoom);
  };

  useEffect(() => {
    let cancelled = false;
    setPdf(null); setError(''); setPageNumber(1); setInternalZoom(initialZoom);
    const task = getDocument({ data: new Uint8Array(documentBuffer(content)) });
    task.promise.then(document => { if (!cancelled) setPdf(document); }).catch(() => {
      if (!cancelled) setError('Impossible de lire ce PDF. Vérifiez le fichier original.');
    });
    return () => { cancelled = true; void task.destroy(); };
  }, [content, initialZoom]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0].contentRect.width - (continuous ? 0 : 32))));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [continuous]);

  if (continuous) {
    return (
      <section ref={container} className="mx-auto w-full max-w-[850px] space-y-4" aria-label={label}>
        {error ? <p role="alert" className="p-4 text-sm text-loss">{error}</p> : pdf ? (
          Array.from({ length: pdf.numPages }, (_, index) => (
            <ContinuousPdfPage key={index + 1} pdf={pdf} pageNumber={index + 1} width={width} />
          ))
        ) : <p role="status" className="p-4 text-sm text-muted-foreground">Chargement du PDF…</p>}
      </section>
    );
  }

  return (
    <div className="flex h-[75dvh] min-h-[500px] flex-col" aria-label={label}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Page précédente" disabled={!pdf || pageNumber === 1} onClick={() => setPageNumber(number => number - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-12 text-center text-xs tabular-nums" aria-live="polite">{pageNumber} / {pdf?.numPages || '—'}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Page suivante" disabled={!pdf || pageNumber === pdf.numPages} onClick={() => setPageNumber(number => number + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Réduire le zoom" disabled={!pdf || zoom <= PDF_MIN_ZOOM} onClick={() => changeZoom(-0.25)}><Minus className="h-3.5 w-3.5" /></Button>
          <span className="min-w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)} %</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Augmenter le zoom" disabled={!pdf || zoom >= PDF_MAX_ZOOM} onClick={() => changeZoom(0.25)}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div ref={container} className="relative min-h-0 flex-1 overflow-auto bg-secondary/60 p-4">
        {error ? <p role="alert" className="p-4 text-sm text-loss">{error}</p> : pdf ? (
          <PdfCanvasPage pdf={pdf} pageNumber={pageNumber} width={width} zoom={zoom} />
        ) : <p role="status" className="p-4 text-center text-sm text-muted-foreground">Chargement du PDF…</p>}
      </div>
    </div>
  );
}

interface PdfPageProps { pdf: PDFDocumentProxy; pageNumber: number; width: number; }

function ContinuousPdfPage(props: PdfPageProps) {
  const placeholder = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const page = placeholder.current;
    if (!page) return;
    // Keep a page's A4 space reserved while only drawing canvases near the reader.
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), { rootMargin: '700px 0px' });
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={placeholder} className="relative aspect-[210/297] w-full bg-white">
      {nearViewport && <PdfCanvasPage {...props} zoom={1} />}
    </div>
  );
}

function PdfCanvasPage({ pdf, pageNumber, width, zoom }: PdfPageProps & { zoom: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!width || !canvas.current) return;
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
    <>
      {error ? <p role="alert" className="p-4 text-sm text-loss">{error}</p> : rendering && (
        <div role="status" className="absolute inset-x-0 top-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement de la page…</div>
      )}
      <canvas ref={canvas} className={`mx-auto block bg-white shadow-sm ${rendering || error ? 'invisible' : ''}`} role="img" aria-label={`Page ${pageNumber} du document PDF`} />
      <p className="sr-only">{text}</p>
    </>
  );
}
