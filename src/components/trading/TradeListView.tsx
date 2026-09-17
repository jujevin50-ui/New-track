import { useState, useRef, useEffect } from 'react';
import { Trade, getNetResult, getTradeScreenshots } from '@/types/trade';
import { Account } from '@/types/account';
import { X, GripVertical, Star, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradeListViewProps {
  trades: Trade[];
  accounts: Account[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

const formatTradeNumber = (n: number) => String(n).padStart(4, '0');

const TradeListView = ({ trades, accounts, onEdit, onDelete }: TradeListViewProps) => {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [panelWidth, setPanelWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getTradePercent = (trade: Trade) => {
    const acc = accounts.find(a => a.id === trade.accountId);
    const balance = acc?.initialBalance || 1;
    return (getNetResult(trade) / balance) * 100;
  };

  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date) || b.tradeNumber - a.tradeNumber);

  // Drag to resize panel
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      setPanelWidth(Math.max(350, Math.min(newWidth, rect.width * 0.7)));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (trades.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No trades recorded. Click "Add Trade" to get started.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-260px)] gap-0 rounded-lg border border-border overflow-hidden bg-card">
      {/* Trade list */}
      <ScrollArea className={`${selectedTrade ? 'flex-1' : 'w-full'} min-w-0`}>
        <div className="divide-y divide-border/50">
          {sorted.map(trade => {
            const net = getNetResult(trade);
            const imgs = getTradeScreenshots(trade);
            const isSelected = selectedTrade?.id === trade.id;

            return (
              <div
                key={trade.id}
                onClick={() => setSelectedTrade(trade)}
                className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors hover:bg-accent/40 ${
                  isSelected ? 'bg-accent/60 border-l-2 border-l-primary' : ''
                }`}
              >
                {/* Trade number */}
                <span className="text-sm font-mono text-muted-foreground w-14 shrink-0">#{formatTradeNumber(trade.tradeNumber)}</span>

                {/* Pair */}
                <span className="text-sm font-semibold w-24 shrink-0">{trade.pair}</span>

                {/* Result */}
                <span className={`text-sm font-bold font-mono w-28 shrink-0 ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {net >= 0 ? '+' : ''}{net.toFixed(2)}$
                </span>

                {/* Notes preview */}
                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                  {trade.notes || '—'}
                </span>

                {/* Image thumbnail */}
                <div className="w-20 h-14 shrink-0 rounded-md overflow-hidden bg-secondary/50 border border-border/30">
                  {imgs.length > 0 ? (
                    <img src={imgs[imgs.length - 1]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground/40">—</div>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Detail panel */}
      {selectedTrade && (
        <>
          {/* Resize handle */}
          <div
            onMouseDown={() => setIsDragging(true)}
            className="w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors flex items-center justify-center shrink-0"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/30" />
          </div>

          <div style={{ width: panelWidth }} className="shrink-0 border-l border-border bg-card flex flex-col h-full">
            <TradeDetailPanel
              trade={selectedTrade}
              accounts={accounts}
              getTradePercent={getTradePercent}
              onClose={() => setSelectedTrade(null)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </>
      )}
    </div>
  );
};

interface TradeDetailPanelProps {
  trade: Trade;
  accounts: Account[];
  getTradePercent: (trade: Trade) => number;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

const TradeDetailPanel = ({ trade, accounts, getTradePercent, onClose, onEdit, onDelete }: TradeDetailPanelProps) => {
  const net = getNetResult(trade);
  const imgs = getTradeScreenshots(trade);
  const account = accounts.find(a => a.id === trade.accountId);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">#{String(trade.tradeNumber).padStart(4, '0')}</span>
          <span className="text-sm font-bold">{trade.pair}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${trade.type === 'Buy' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'}`}>
            {trade.type === 'Buy' ? 'Long' : 'Short'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(trade)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(trade.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* P&L Hero */}
          <div className={`rounded-lg p-4 text-center ${net >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
            <p className={`text-2xl font-black font-mono ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
              {net >= 0 ? '+' : ''}{net.toFixed(2)}$
            </p>
            <p className={`text-sm font-mono ${net >= 0 ? 'text-profit/70' : 'text-loss/70'}`}>
              {getTradePercent(trade) >= 0 ? '+' : ''}{getTradePercent(trade).toFixed(2)}%
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Open Date" value={trade.date} />
            <InfoRow label="Close Date">
              {trade.endDate ? (
                <p className="text-sm font-medium">{trade.endDate}</p>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: 'hsl(38 92% 50% / 0.15)', color: 'hsl(38 92% 45%)' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  In Progress
                </span>
              )}
            </InfoRow>
            <InfoRow label="Gross Result" value={`${trade.result >= 0 ? '+' : ''}${trade.result.toFixed(2)}$`} />
            <InfoRow label="Commission" value={`${trade.commission.toFixed(2)}$`} />
            <InfoRow label="Swap" value={`${trade.swap.toFixed(2)}$`} />
            {trade.endDate && (
              <InfoRow label="Exit Type">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  trade.exitType === 'TP' ? 'bg-profit/15 text-profit' :
                  trade.exitType === 'SL' ? 'bg-loss/15 text-loss' :
                  trade.exitType === 'BE' ? 'bg-primary/15 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {trade.exitType}
                </span>
              </InfoRow>
            )}
            <InfoRow label="Setup Quality">
              <div className="flex gap-0.5">
                {Array.from({ length: trade.setupQuality }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 text-primary fill-primary" />
                ))}
              </div>
            </InfoRow>
            <InfoRow label="Strategy Respected">
              <span className={`text-xs font-medium ${trade.strategyRespected ? 'text-profit' : 'text-loss'}`}>
                {trade.strategyRespected ? '✓ Yes' : '✗ No'}
              </span>
            </InfoRow>
            {account && <InfoRow label="Account" value={account.name} />}
          </div>

          {/* Notes */}
          {trade.notes && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
              <div className="rounded-lg bg-secondary/30 p-3 text-sm whitespace-pre-wrap">{trade.notes}</div>
            </div>
          )}

          {/* Screenshots */}
          {imgs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Screenshots ({imgs.length})
              </h3>
              <div className="space-y-2">
                {imgs.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Screenshot ${i + 1}`}
                    className="w-full rounded-lg border border-border"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

const InfoRow = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    {children || <p className="text-sm font-medium">{value}</p>}
  </div>
);

export default TradeListView;
