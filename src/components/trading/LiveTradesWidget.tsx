import { useState, useMemo } from 'react';
import { Trade, getTradeScreenshots } from '@/types/trade';
import { Account } from '@/types/account';
import { Activity, ImageOff } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  trades: Trade[];
  accounts: Account[];
  accentColor?: string;
}

const isLive = (t: Trade) => !t.endDate || t.endDate.trim() === '';

const LiveTradesWidget = ({ trades, accounts, accentColor }: Props) => {
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const c = accentColor || 'hsl(38, 92%, 50%)';

  const live = useMemo(
    () => trades.filter(isLive).sort((a, b) => b.date.localeCompare(a.date)),
    [trades]
  );

  if (live.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
        No live trades
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 auto-rows-min">
        {live.map(t => {
          const imgs = getTradeScreenshots(t);
          const cover = imgs[0];
          const acc = accounts.find(a => a.id === t.accountId);
          return (
            <div
              key={t.id}
              className="rounded-xl border overflow-hidden bg-card flex flex-col"
              style={{ borderColor: `${c}40` }}
            >
              <div
                className="relative w-full aspect-[16/9] bg-secondary/40 cursor-pointer overflow-hidden"
                onClick={() => cover && setLightbox({ images: imgs, index: 0 })}
              >
                {cover ? (
                  <img src={cover} alt={t.pair} className="w-full h-full object-cover hover:scale-[1.02] transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}
                <div
                  className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm uppercase tracking-wider"
                  style={{ backgroundColor: `${c}E6`, color: 'white' }}
                >
                  <Activity className="h-3 w-3 animate-pulse" />
                  Live
                </div>
                <div
                  className={`absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
                    t.type === 'Buy' ? 'bg-profit/85 text-white' : 'bg-loss/85 text-white'
                  }`}
                >
                  {t.type === 'Buy' ? 'Long' : 'Short'}
                </div>
              </div>
              <div className="px-2.5 py-1.5 flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-bold tracking-wide">{t.pair}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {acc?.name || '—'} · {t.date}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  #{String(t.tradeNumber).padStart(4, '0')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto h-auto bg-card border-border p-2 flex items-center justify-center">
          {lightbox && (
            <img src={lightbox.images[lightbox.index]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveTradesWidget;
