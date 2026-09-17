import { useState, useEffect } from 'react';
import { Trade, getNetResult, getTradeR, getTradeScreenshots } from '@/types/trade';
import { Account } from '@/types/account';
import { Payout } from '@/hooks/usePayouts';
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, FileText, Star, Banknote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TradeTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  accounts?: Account[];
  payouts?: Payout[];
  onDeletePayout?: (id: string) => void;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pad = (n: number) => String(n).padStart(4, '0');

const EXIT_STYLES: Record<string, string> = {
  TP:     'bg-[hsl(142_71%_45%/0.12)] text-profit border-[hsl(142_71%_45%/0.25)]',
  SL:     'bg-[hsl(0_84%_60%/0.12)] text-loss border-[hsl(0_84%_60%/0.25)]',
  BE:     'bg-[hsl(246_90%_63%/0.12)] text-balance border-[hsl(246_90%_63%/0.25)]',
  Manual: 'bg-secondary text-muted-foreground border-border/60',
  Trail:  'bg-[hsl(38_92%_50%/0.12)] text-drawdown border-[hsl(38_92%_50%/0.25)]',
};

type SortDir = 'asc' | 'desc' | null;

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
}

const TradeTable = ({ trades, onEdit, onDelete, accounts = [], payouts = [], onDeletePayout }: TradeTableProps) => {
  const [sortField, setSortField] = useState(() => localStorage.getItem('trade-sort-field') || 'date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('trade-sort-dir') as 'asc' | 'desc') || 'desc'
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const getTradePercent = (t: Trade) => {
    const bal = accounts.find(a => a.id === t.accountId)?.initialBalance || 1;
    return (t.result / bal) * 100;
  };

  const isSorted = sortField !== 'date' || sortDir !== 'desc';

  const toggleSort = (field: string) => {
    if (sortField === field) {
      const d = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(d);
      localStorage.setItem('trade-sort-dir', d);
    } else {
      setSortField(field);
      setSortDir('desc');
      localStorage.setItem('trade-sort-field', field);
      localStorage.setItem('trade-sort-dir', 'desc');
    }
  };

  const clearSort = () => {
    setSortField('date');
    setSortDir('desc');
    localStorage.setItem('trade-sort-field', 'date');
    localStorage.setItem('trade-sort-dir', 'desc');
  };

  type UnifiedRow = { kind: 'trade'; data: Trade; sortDate: string } | { kind: 'payout'; data: Payout; sortDate: string };

  const unified: UnifiedRow[] = [
    ...trades.map(t => ({ kind: 'trade' as const, data: t, sortDate: t.endDate || t.date })),
    ...payouts.map(p => ({ kind: 'payout' as const, data: p, sortDate: p.date })),
  ].sort((a, b) => {
    if (sortField !== 'date' && a.kind === 'trade' && b.kind === 'trade') {
      const av = (a.data as any)[sortField];
      const bv = (b.data as any)[sortField];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const cmp = a.sortDate.localeCompare(b.sortDate);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Flat list of every screenshot across all trades (in table order) for the lightbox.
  const allImages = unified
    .filter((r): r is Extract<UnifiedRow, { kind: 'trade' }> => r.kind === 'trade')
    .flatMap(r =>
      getTradeScreenshots(r.data).map(src => ({ src, tradeNumber: r.data.tradeNumber, pair: r.data.pair }))
    );

  const openLightbox = (src: string) => {
    const i = allImages.findIndex(im => im.src === src);
    setLightboxIndex(i >= 0 ? i : 0);
  };
  const showPrev = () => setLightboxIndex(i => (i === null ? i : (i - 1 + allImages.length) % allImages.length));
  const showNext = () => setLightboxIndex(i => (i === null ? i : (i + 1) % allImages.length));

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') showPrev();
      else if (e.key === 'ArrowRight') showNext();
      else if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, allImages.length]);

  if (unified.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-16 text-center">
        <p className="text-sm text-muted-foreground">No trades yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Trade" to get started.</p>
      </div>
    );
  }

  const Th = ({ field, children, className = '' }: { field?: string; children: React.ReactNode; className?: string }) => (
    <th
      onClick={field ? () => toggleSort(field) : undefined}
      className={`px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest select-none whitespace-nowrap
        ${field ? 'cursor-pointer hover:text-foreground transition-colors' : ''} ${className}`}
    >
      {field ? (
        <span className="inline-flex items-center gap-1">
          {children}
          <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
        </span>
      ) : children}
    </th>
  );

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[1140px]">
            <colgroup>
              <col style={{ width: 56 }} />
              <col />
              <col style={{ width: 104 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 84 }} />
              <col style={{ width: 78 }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 84 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 126 }} />
              <col style={{ width: 84 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                <Th field="tradeNumber">#</Th>
                <Th field="pair">Pair</Th>
                <Th field="date">Entry</Th>
                <Th field="endDate">Exit Date</Th>
                <Th field="result">P&L</Th>
                <Th>%</Th>
                <Th>R</Th>
                <Th field="exitType">Exit</Th>
                <Th field="setupQuality">Quality</Th>
                <Th field="strategyRespected">Strategy</Th>
                <Th>Screen</Th>
                <th className="px-4 py-2.5 text-right">
                  {isSorted && (
                    <button
                      onClick={clearSort}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Sort
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {unified.map((row, idx) => {
                if (row.kind === 'payout') {
                  const p = row.data;
                  return (
                    <tr key={`payout-${p.id}`}
                      className={`group border-b border-border/40 last:border-0 ${idx % 2 === 0 ? '' : 'bg-secondary/10'}`}
                      style={{ backgroundColor: 'hsl(38 92% 50% / 0.04)' }}
                    >
                      <td className="px-4 py-3">
                        <Banknote className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                            style={{ backgroundColor: 'hsl(38 92% 50% / 0.12)', color: 'hsl(38 92% 45%)' }}>
                            PAYOUT
                          </span>
                          {(() => {
                            const acc = accounts.find(a => a.id === p.accountId);
                            return acc ? (
                              <span className="flex items-center gap-1">
                                <span className="text-[11px] text-foreground/70 font-medium truncate max-w-[100px]">{acc.name}</span>
                                {acc.accountCode && (
                                  <span className="font-mono text-[9px] text-muted-foreground/60 bg-secondary px-1 py-0.5 rounded">{acc.accountCode}</span>
                                )}
                              </span>
                            ) : null;
                          })()}
                          {p.note && <span className="text-[11px] text-muted-foreground/60 truncate max-w-[80px] italic">{p.note}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-[11px] text-foreground/80">{p.date}</p>
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm font-bold tabular-nums text-blue-400">+${fmt(p.amount)}</p>
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeletePayout?.(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const trade = row.data;
                const net = getNetResult(trade);
                const pct = getTradePercent(trade);
                const imgs = getTradeScreenshots(trade);
                const isProfit = net >= 0;
                const exitStyle = EXIT_STYLES[trade.exitType] || EXIT_STYLES.Manual;
                const account = accounts.find(a => a.id === trade.accountId);
                const rValue = getTradeR(trade, account?.initialBalance || 0);

                return (
                  <tr
                    key={trade.id}
                    onClick={() => onEdit(trade)}
                    className={`group border-b border-border/40 last:border-0 transition-colors hover:bg-accent/25 cursor-pointer animate-fade-in-up
                      ${idx % 2 === 0 ? '' : 'bg-secondary/10'}`}
                    style={{ animationDelay: `${Math.min(idx, 30) * 22}ms` }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-muted-foreground/60">{pad(trade.tradeNumber)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                          ${trade.type === 'Buy'
                            ? 'bg-[hsl(142_71%_45%/0.12)] text-profit'
                            : 'bg-[hsl(0_84%_60%/0.12)] text-loss'}`}>
                          {trade.type === 'Buy' ? 'L' : 'S'}
                        </span>
                        <div>
                          <span className="text-sm font-semibold tracking-tight">{trade.pair}</span>
                          {account && (
                            <p className="text-[10px] text-muted-foreground/60 leading-none mt-0.5">{account.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] text-foreground/80">{trade.date}</p>
                    </td>
                    <td className="px-4 py-3">
                      {trade.endDate ? (
                        <p className="font-mono text-[11px] text-muted-foreground">{trade.endDate}</p>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ backgroundColor: 'hsl(38 92% 50% / 0.12)', color: 'hsl(38 92% 45%)' }}>
                          <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
                          Live
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                        {isProfit ? '+' : ''}${fmt(net)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[13px] font-semibold tabular-nums ${isProfit ? 'text-profit' : 'text-loss'}`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rValue !== null ? (
                        <span className={`font-mono text-sm font-bold tabular-nums ${rValue >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {rValue >= 0 ? '+' : ''}{rValue.toFixed(2)}R
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trade.endDate ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${exitStyle}`}>
                          {trade.exitType}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < trade.setupQuality ? 'fill-primary text-primary' : 'text-border fill-transparent'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md
                        ${trade.strategyRespected
                          ? 'bg-[hsl(142_71%_45%/0.1)] text-profit'
                          : 'bg-[hsl(0_84%_60%/0.1)] text-loss'}`}>
                        {trade.strategyRespected ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {imgs.length > 0 ? (
                        <button
                          onClick={() => openLightbox(imgs[0])}
                          className="relative block h-16 w-24 rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors"
                        >
                          <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
                          {imgs.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 leading-tight rounded-tl">
                              +{imgs.length - 1}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {trade.notes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs"><p className="text-xs">{trade.notes}</p></TooltipContent>
                          </Tooltip>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(trade.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer — totals aligned with columns */}
            <tfoot>
            {(() => {
          const totalNet = trades.reduce((s, t) => s + getNetResult(t), 0);
          const totalPct = trades.reduce((s, t) => {
            const bal = accounts.find(a => a.id === t.accountId)?.initialBalance || 1;
            return s + (t.result / bal) * 100;
          }, 0);
          const wins = trades.filter(t => getNetResult(t) > 0).length;
          const wr = trades.length > 0 ? (wins / trades.length) * 100 : 0;
          const totalR = trades.reduce((s, t) => {
            const bal = accounts.find(a => a.id === t.accountId)?.initialBalance || 0;
            const r = getTradeR(t, bal);
            return r !== null ? s + r : s;
          }, 0);
          return (
                <tr className="border-t border-border bg-secondary/30">
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {trades.length} trade{trades.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5">
                    <p className={`font-mono text-sm font-bold tabular-nums ${totalNet >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {totalNet >= 0 ? '+' : ''}${fmt(totalNet)}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-[13px] font-semibold tabular-nums ${totalPct >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-sm font-bold tabular-nums ${totalR >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {totalR >= 0 ? '+' : ''}{totalR.toFixed(2)}R
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {wins}W · {trades.length - wins}L
                    </span>
                  </td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                      {wr.toFixed(0)}% WR
                    </span>
                  </td>
                  <td className="px-4 py-2.5" />
                  <td className="px-3 py-2.5" />
                </tr>
          );
        })()}
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={o => !o && setLightboxIndex(null)}>
        <DialogContent className="sm:max-w-5xl bg-card border-border p-0 overflow-hidden">
          {lightboxIndex !== null && allImages[lightboxIndex] && (
            <div className="flex flex-col">
              <div className="relative flex items-center justify-center bg-black/50 min-h-[55vh] max-h-[82vh]">
                <img
                  src={allImages[lightboxIndex].src}
                  alt={`Screenshot ${lightboxIndex + 1}`}
                  className="max-h-[82vh] w-auto object-contain"
                />
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={showPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      aria-label="Previous"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={showNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      aria-label="Next"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-card">
                <span className="text-xs font-medium text-foreground">
                  {allImages[lightboxIndex].pair}
                  <span className="text-muted-foreground/60 font-mono ml-2">#{pad(allImages[lightboxIndex].tradeNumber)}</span>
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {lightboxIndex + 1} / {allImages.length}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TradeTable;
