import { useEffect, useMemo, useState } from 'react';
import {
  Trade,
  getNetResult,
  getTradeR,
  getTradeScreenshots,
} from '@/types/trade';
import { Account } from '@/types/account';
import { Payout } from '@/hooks/usePayouts';
import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  FileText,
  Trash2,
  X,
} from 'lucide-react';
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

type SortDir = 'asc' | 'desc';
type SortField = 'tradeNumber' | 'pair' | 'date' | 'endDate' | 'result' | 'riskPercent';

const money = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const pad = (value: number) => String(value).padStart(4, '0');

const EXIT_STYLES: Record<string, string> = {
  TP: 'bg-profit/10 text-profit border-profit/20',
  SL: 'bg-loss/10 text-loss border-loss/20',
  BE: 'bg-balance/10 text-balance border-balance/20',
  Manual: 'bg-secondary text-muted-foreground border-border',
  Trail: 'bg-drawdown/10 text-drawdown border-drawdown/20',
};

const TradeTable = ({
  trades,
  onEdit,
  onDelete,
  accounts = [],
  payouts = [],
  onDeletePayout,
}: TradeTableProps) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const rows = useMemo(() => {
    const unified = [
      ...trades.map(trade => ({
        kind: 'trade' as const,
        data: trade,
        sortDate: trade.endDate || trade.date,
      })),
      ...payouts.map(payout => ({
        kind: 'payout' as const,
        data: payout,
        sortDate: payout.date,
      })),
    ];

    unified.sort((a, b) => {
      if (a.kind === 'trade' && b.kind === 'trade') {
        const av = a.data[sortField as keyof Trade] as any;
        const bv = b.data[sortField as keyof Trade] as any;

        let comparison = 0;

        if (sortField === 'result' || sortField === 'riskPercent') {
          comparison = Number(av || 0) - Number(bv || 0);
        } else {
          comparison = String(av ?? '').localeCompare(String(bv ?? ''));
        }

        return sortDir === 'asc' ? comparison : -comparison;
      }

      const comparison = a.sortDate.localeCompare(b.sortDate);
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return unified;
  }, [trades, payouts, sortField, sortDir]);

  const allImages = useMemo(
    () =>
      rows
        .filter((row): row is Extract<(typeof rows)[number], { kind: 'trade' }> => row.kind === 'trade')
        .flatMap(row =>
          getTradeScreenshots(row.data).map(src => ({
            src,
            pair: row.data.pair,
            tradeNumber: row.data.tradeNumber,
          }))
        ),
    [rows]
  );

  const totalNet = trades.reduce((sum, trade) => sum + getNetResult(trade), 0);
  const totalRiskR = trades.reduce((sum, trade) => {
    const account = accounts.find(item => item.id === trade.accountId);
    const value = getTradeR(trade, account?.initialBalance || 0);
    return value === null ? sum : sum + value;
  }, 0);

  const wins = trades.filter(trade => getNetResult(trade) > 0).length;
  const losses = trades.filter(trade => getNetResult(trade) < 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  const totalPct = trades.reduce((sum, trade) => {
    const account = accounts.find(item => item.id === trade.accountId);
    const balance = account?.initialBalance || 0;
    return balance ? sum + (getNetResult(trade) / balance) * 100 : sum;
  }, 0);

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDir('desc');
  };

  const showPrevious = () => {
    setLightboxIndex(index =>
      index === null ? null : (index - 1 + allImages.length) % allImages.length
    );
  };

  const showNext = () => {
    setLightboxIndex(index =>
      index === null ? null : (index + 1) % allImages.length
    );
  };

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
      if (event.key === 'Escape') setLightboxIndex(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, allImages.length]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm font-medium">No trades yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a trade to start building your journal.
        </p>
      </div>
    );
  }

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field ? (
        sortDir === 'asc' ? (
          <ChevronUp className="h-3 w-3 text-primary" />
        ) : (
          <ChevronDown className="h-3 w-3 text-primary" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-25" />
      )}
    </button>
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-secondary/20 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Trade history</p>
            <p className="text-[11px] text-muted-foreground">
              {trades.length} trades · {wins}W / {losses}L · {winRate.toFixed(0)}% win rate
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            <div>
              <span className="text-muted-foreground">Net </span>
              <span className={totalNet >= 0 ? 'text-profit' : 'text-loss'}>
                {totalNet >= 0 ? '+' : ''}${money(totalNet)}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-border" />
            <div className="hidden sm:block">
              <span className="text-muted-foreground">R </span>
              <span className={totalRiskR >= 0 ? 'text-profit' : 'text-loss'}>
                {totalRiskR >= 0 ? '+' : ''}{totalRiskR.toFixed(2)}R
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/35">
                <th className="px-4 py-3 text-left"><SortButton field="tradeNumber">#</SortButton></th>
                <th className="px-4 py-3 text-left"><SortButton field="pair">Pair</SortButton></th>
                <th className="px-4 py-3 text-left"><SortButton field="date">Date</SortButton></th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-right"><SortButton field="result">Net P&L</SortButton></th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">R</th>
                <th className="px-4 py-3 text-center">Exit</th>
                <th className="px-4 py-3 text-center">Quality</th>
                <th className="px-4 py-3 text-center">Strategy</th>
                <th className="px-4 py-3 text-center">Note</th>
                <th className="px-4 py-3 text-center">Screen</th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                if (row.kind === 'payout') {
                  const payout = row.data;

                  return (
                    <tr
                      key={`payout-${payout.id}`}
                      className="border-b border-border/40 bg-primary/[0.025] hover:bg-primary/[0.045]"
                    >
                      <td className="px-4 py-3"><Banknote className="h-4 w-4 text-muted-foreground/50" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                            Payout
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {accounts.find(a => a.id === payout.accountId)?.name || ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payout.date}</td>
                      <td colSpan={9} className="px-4 py-3 text-xs text-muted-foreground">
                        {payout.note || 'Payout'}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onDeletePayout?.(payout.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                }

                const trade = row.data;
                const net = getNetResult(trade);
                const account = accounts.find(a => a.id === trade.accountId);
                const balance = account?.initialBalance || 0;
                const pct = balance ? (net / balance) * 100 : 0;
                const r = getTradeR(trade, balance);
                const screenshots = getTradeScreenshots(trade);
                const isProfit = net > 0;
                const exitStyle = EXIT_STYLES[trade.exitType] || EXIT_STYLES.Manual;

                return (
                  <tr
                    key={trade.id}
                    onClick={() => onEdit(trade)}
                    className={`group cursor-pointer border-b border-border/35 transition-colors hover:bg-accent/25 ${
                      index % 2 ? 'bg-secondary/[0.06]' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] text-muted-foreground/65">#{pad(trade.tradeNumber)}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${trade.type === 'Buy' ? 'bg-profit' : 'bg-loss'}`} />
                        <div className="min-w-0">
                          <div className="font-semibold tracking-tight">{trade.pair}</div>
                          {account && (
                            <div className="mt-0.5 truncate text-[9px] text-muted-foreground">{account.name}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono text-[11px]">{trade.date}</div>
                      {trade.endDate && trade.endDate !== trade.date && (
                        <div className="mt-0.5 text-[9px] text-muted-foreground">→ {trade.endDate}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                        trade.type === 'Buy'
                          ? 'border-profit/20 bg-profit/10 text-profit'
                          : 'border-loss/20 bg-loss/10 text-loss'
                      }`}>
                        {trade.type === 'Buy' ? 'Long' : 'Short'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className={`font-mono text-sm font-bold tabular-nums ${isProfit ? 'text-profit' : net < 0 ? 'text-loss' : 'text-foreground'}`}>
                        {net > 0 ? '+' : ''}${money(net)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono text-xs font-semibold tabular-nums ${
                        pct > 0 ? 'text-profit' : pct < 0 ? 'text-loss' : 'text-muted-foreground'
                      }`}>
                        {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono text-xs font-bold tabular-nums ${
                        r === null ? 'text-muted-foreground' : r > 0 ? 'text-profit' : r < 0 ? 'text-loss' : 'text-foreground'
                      }`}>
                        {r === null ? '—' : `${r > 0 ? '+' : ''}${r.toFixed(2)}R`}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-semibold ${exitStyle}`}>
                        {trade.exitType}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs text-foreground/80">
                        {'★'.repeat(trade.setupQuality)}
                        <span className="text-muted-foreground/25">{'★'.repeat(3 - trade.setupQuality)}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-semibold ${
                        trade.strategyRespected
                          ? 'border-profit/20 bg-profit/10 text-profit'
                          : 'border-loss/20 bg-loss/10 text-loss'
                      }`}>
                        {trade.strategyRespected ? 'Yes' : 'No'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      {trade.notes ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="whitespace-pre-wrap text-xs">{trade.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      {screenshots.length ? (
                        <button
                          type="button"
                          onClick={() => {
                            const firstIndex = allImages.findIndex(image => image.src === screenshots[0]);
                            setLightboxIndex(firstIndex >= 0 ? firstIndex : 0);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {screenshots.length}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>

                    <td className="px-2 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => onDelete(trade.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="border-t border-border bg-secondary/30">
                <td className="px-4 py-3" />
                <td className="px-4 py-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </span>
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">
                  {trades.length} trade{trades.length !== 1 ? 's' : ''}
                </td>
                <td />
                <td className={`px-4 py-3 text-right font-mono text-sm font-bold ${totalNet >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {totalNet >= 0 ? '+' : ''}${money(totalNet)}
                </td>
                <td className={`px-4 py-3 text-right font-mono text-xs font-semibold ${totalPct >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}%
                </td>
                <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${totalRiskR >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {totalRiskR >= 0 ? '+' : ''}{totalRiskR.toFixed(2)}R
                </td>
                <td colSpan={2} />
                <td className="px-4 py-3 text-center">
                  <span className="text-[10px] font-semibold text-muted-foreground">{wins}W · {losses}L</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[10px] font-semibold text-muted-foreground">{winRate.toFixed(0)}% WR</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={open => !open && setLightboxIndex(null)}
      >
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
                      type="button"
                      onClick={showPrevious}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={showNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2.5">
                <span className="text-xs font-medium">
                  {allImages[lightboxIndex].pair}
                  <span className="ml-2 font-mono text-muted-foreground">#{pad(allImages[lightboxIndex].tradeNumber)}</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
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
