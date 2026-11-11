import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StrategyPdfViewer from './StrategyPdfViewer';

export default function ReportPdfPreview({ generate, label }: { generate: () => Promise<string | undefined>; label: string }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setContent(''); setError(false);
    void generate().then(value => {
      if (!cancelled) { if (value) setContent(value); else setError(true); }
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [generate, retry]);

  if (error) return <div role="alert" className="flex min-h-80 flex-col items-center justify-center gap-4 text-sm text-muted-foreground"><p>Impossible de préparer le PDF.</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Réessayer</Button></div>;
  if (!content) return <div role="status" className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Préparation du rapport…</div>;
  return <StrategyPdfViewer content={content} label={label} initialZoom={0.5}/>;
}
