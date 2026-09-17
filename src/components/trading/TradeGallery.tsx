import { Trade, getNetResult, getTradeScreenshots } from '@/types/trade';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useState } from 'react';

interface TradeGalleryProps {
  trades: Trade[];
}

const formatTradeNumber = (n: number) => String(n).padStart(4, '0');

const TradeGallery = ({ trades }: TradeGalleryProps) => {
  const [previewImgs, setPreviewImgs] = useState<string[] | null>(null);

  const tradesWithScreenshots = trades.filter(t => getTradeScreenshots(t).length > 0);

  if (tradesWithScreenshots.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No trade images. Paste screenshots when adding trades.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tradesWithScreenshots.map(trade => {
          const net = getNetResult(trade);
          const imgs = getTradeScreenshots(trade);
          return (
            <div key={trade.id} className="bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => setPreviewImgs(imgs)}>
              <div className="aspect-video overflow-hidden">
                <img src={imgs[imgs.length - 1]} alt={`Trade ${formatTradeNumber(trade.tradeNumber)}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">#{formatTradeNumber(trade.tradeNumber)}</span>
                  <span className="text-xs font-semibold">{trade.pair}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{trade.endDate}</span>
                  <span className={`text-sm font-bold font-mono ${net >= 0 ? 'text-profit' : 'text-loss'}`}>{net >= 0 ? '+' : ''}{net.toFixed(2)}$</span>
                </div>
                {imgs.length > 1 && (<span className="text-[9px] text-muted-foreground">{imgs.length} images</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={!!previewImgs} onOpenChange={() => setPreviewImgs(null)}>
        <DialogContent className="max-w-[85vw] max-h-[85vh] w-full h-full bg-card border-border p-2 overflow-y-auto">
          {previewImgs && (<div className="space-y-2">{previewImgs.map((img, i) => (<img key={i} src={img} alt={`Screenshot ${i + 1}`} className="w-full h-auto rounded-md object-contain" />))}</div>)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TradeGallery;
