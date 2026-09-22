import { useState, useEffect, useMemo } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { usePayouts } from '@/hooks/usePayouts';
import { useData } from '@/contexts/DataContext';
import { Account, AccountFormData } from '@/types/account';
import { Trade, TradeFormData } from '@/types/trade';
import TradeTable from '@/components/trading/TradeTable';
import TradeGallery from '@/components/trading/TradeGallery';
import TradeListView from '@/components/trading/TradeListView';
import TradeFilters from '@/components/trading/TradeFilters';
import AddTradeDialog from '@/components/trading/AddTradeDialog';
import PayoutDialog from '@/components/trading/PayoutDialog';
import { Button } from '@/components/ui/button';
import { Plus, List, Image, Banknote, Download } from 'lucide-react';
import { exportTradesToCSV } from '@/lib/csvImport';

interface TradesPageProps {
  activeAccount: Account | null;
  accounts: Account[];
  onAddAccount: (data: AccountFormData) => Promise<Account>;
  onUpdateAccount: (id: string, data: AccountFormData) => Promise<void>;
}

const baseCode = (code: string) => code.replace(/-\d+$/, '') || code;

const nextAccountCode = (source: Account, allAccounts: Account[]) => {
  if (!source.accountCode) return '';
  const base = baseCode(source.accountCode);
  const siblings = allAccounts.filter(a => baseCode(a.accountCode) === base);
  return `${base}-${siblings.length}`;
};

const Trades = ({ activeAccount, accounts, onAddAccount, onUpdateAccount }: TradesPageProps) => {
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades(
    activeAccount?.id || null,
    activeAccount?.initialBalance || 0
  );

  const { addPayout, deletePayout } = usePayouts(null);
  const { data } = useData();

  const allPayouts = useMemo(
    () => (data.payouts as any[] || []).map((p: any) => ({
      id: p.id,
      accountId: p.accountId,
      amount: Number(p.amount),
      date: p.date,
      note: p.note || '',
    })),
    [data.payouts]
  );

  const accountProfits = useMemo(() => {
    const map: Record<string, number> = {};

    accounts.forEach(a => {
      const acctTrades = (data.trades as any[]).filter(t => t.accountId === a.id);
      const profit = acctTrades.reduce(
        (sum: number, t: any) =>
          sum + Number(t.result || 0) + Number(t.commission || 0) + Number(t.swap || 0),
        0
      );

      const paid = (data.payouts as any[] || [])
        .filter(p => p.accountId === a.id)
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      map[a.id] = Math.max(0, profit - paid);
    });

    return map;
  }, [accounts, data.trades, data.payouts]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [view, setView] = useState<'list' | 'table' | 'gallery'>('table');
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);

  useEffect(() => {
    setFilteredTrades(trades);
  }, [trades]);

  const handleSubmit = (formData: TradeFormData) => {
    if (editTrade) {
      updateTrade(editTrade.id, formData);
      setEditTrade(null);
    } else {
      addTrade(formData);
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditTrade(trade);
    setEditPanelOpen(true);
  };

  const closeEditPanel = () => {
    setEditPanelOpen(false);
    setTimeout(() => setEditTrade(null), 300);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditTrade(null);
  };

  const handlePayout = async (
    accountId: string,
    amount: number,
    date: string,
    note: string
  ) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    await addPayout(amount, date, note, accountId);

    const { id: _id, ...rest } = account;
    await onUpdateAccount(accountId, { ...rest, status: 'paid_out' });

    const newCode = nextAccountCode(account, accounts);
    await onAddAccount({
      ...rest,
      accountCode: newCode,
      status: 'active',
      createdAt: date,
    });
  };

  const handleExport = () => {
    const csv = exportTradesToCSV(filteredTrades);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `trades_${activeAccount?.name?.replace(/\s+/g, '_') || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No account selected.</p>
          <p className="text-xs text-muted-foreground">
            Create an account in the "Accounts" section to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Trades</h1>
          <p className="text-xs text-muted-foreground">
            {activeAccount.name} · {filteredTrades.length}/{trades.length} trade{trades.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border overflow-hidden bg-card">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === 'table'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>

            <button
              onClick={() => setView('gallery')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                view === 'gallery'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Image className="h-3.5 w-3.5" />
              Gallery
            </button>
          </div>

          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button size="sm" variant="outline" onClick={() => setPayoutOpen(true)} className="gap-1.5">
            <Banknote className="h-4 w-4" />
            Payout
          </Button>

          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>
        </div>
      </div>

      <TradeFilters trades={trades} onFiltered={setFilteredTrades} />

      <div className="min-w-0">
        {view === 'list' ? (
          <TradeListView
            trades={filteredTrades}
            accounts={accounts}
            onEdit={handleEdit}
            onDelete={deleteTrade}
          />
        ) : view === 'table' ? (
          <TradeTable
            trades={filteredTrades}
            onEdit={handleEdit}
            onDelete={deleteTrade}
            accounts={accounts}
            payouts={allPayouts}
            onDeletePayout={deletePayout}
          />
        ) : (
          <TradeGallery trades={filteredTrades} />
        )}
      </div>

      <AddTradeDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        onSubmit={handleSubmit}
        accounts={accounts}
        activeAccountId={activeAccount.id}
      />

      <PayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        onSubmit={handlePayout}
        accounts={accounts}
        defaultAccountId={activeAccount.id === 'all' ? undefined : activeAccount.id}
        accountProfits={accountProfits}
      />

      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          editPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeEditPanel}
      />

      <div
        className={`fixed inset-y-0 right-0 z-50 w-1/3 min-w-[480px] bg-card border-l border-border shadow-[-6px_0_40px_hsl(0_0%_0%/0.45)] transition-transform duration-300 ease-out ${
          editPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <AddTradeDialog
          open={editPanelOpen}
          onOpenChange={closeEditPanel}
          onSubmit={handleSubmit}
          editTrade={editTrade}
          accounts={accounts}
          activeAccountId={activeAccount.id}
          asPanel
        />
      </div>
    </div>
  );
};

export default Trades;
