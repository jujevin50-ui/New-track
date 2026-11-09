import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StrategyPdfViewer from '@/components/trading/StrategyPdfViewer';
import { documentBuffer } from '@/lib/strategyDocuments';
import type { FinanceAssetProfile } from '@/lib/financeAssets';

export default function AssetPdfDocument({ pdf }: { pdf: NonNullable<FinanceAssetProfile['pdf']> }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([documentBuffer(pdf.content)], { type: 'application/pdf' }));
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf.content]);
  return <div className="overflow-hidden rounded-xl border border-border/60"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-3"><p className="min-w-0 break-all text-xs font-medium">{pdf.name}</p>{url && <Button asChild variant="outline" size="sm"><a href={url} download={pdf.name}><Download className="h-4 w-4" />Télécharger</a></Button>}</div><StrategyPdfViewer content={pdf.content} label="Fiche PDF de l’actif" /></div>;
}
