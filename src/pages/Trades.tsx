import { useState, useEffect, useMemo } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { usePendingOrders } from '@/hooks/usePendingOrders';
import { usePayouts } from '@/hooks/usePayouts';
import { useData } from '@/contexts/DataContext';
import { Account, AccountFormData } from '@/types/account';
import { Trade, TradeFormData } from '@/types/trade';
import TradeTable from '@/components/trading/TradeTable';
import TradeGallery from '@/components/trading/TradeGallery';
import TradeListView from '@/components/trading/TradeListView';
import TradeFilters from '@/components/trading/TradeFilters';
import PendingOrdersSection from '@/components/trading/PendingOrdersSection';
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

/* ── derive base code (strip trailing -N suffix) ── */
const baseCode = (code: string) => code.replace(/-\d+$/, '') || code;

/* ── next accountCode after a payout ── */
const nextAccountCode = (source: Account, allAccounts: Account[]) => {
  if (!source.accountCode) return '';
  const base = baseCode(source.accountCode);
  const siblings = allAccounts.filter(a => baseCode(a.accountCode) === base);
  return `${base}-${siblings.length}`;
};

const Trades = ({ activeAccount, accounts, onAddAccount, onUpdateAccount }: TradesPageProps) => {
  const { trades, addTrade, addTrades, updateTrade, deleteTrade } = useTrades(
    activeAccount?.id || null,
    activeAccount?.initialBalance || 0
  );
  const {
    pendingOrders, addOrder, updateOrder, deleteOrder,
    triggerOrder, cancelOrder,
  } = usePendingOrders(activeAccount?.id || null);

  const { addPayout, deletePayout } = usePayouts(null);

  // Tous les payouts pour le tableau (pas seulement le compte actif)
  const { data } = useData();
  const allPayouts = useMemo(() => (data.payouts as any[] || []).map((p: any) => ({
    id: p.id, accountId: p.accountId, amount: Number(p.amount), date: p.date, note: p.note || '',
  })), [data.payouts]);
  const accountProfits = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => {
      const acctTrades = (data.trades as any[]).filter(t => t.accountId === a.id);
      const profit = acctTrades.reduce((s: number, t: any) =>
        s + (Number(t.result) - Number(t.commission || 0) - Number(t.swap || 0)), 0);
      const paid = (data.payouts as any[] || [])
        .filter(p => p.accountId === a.id)
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
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

  useEffect(() => { setFilteredTrades(trades); }, [trades]);

  const handleSubmit = (data: TradeFormData) => {
    if (editTrade) { updateTrade(editTrade.id, data); setEditTrade(null); }
    else addTrade(data);
  };

  const handleEdit = (trade: Trade) => { setEditTrade(trade); setEditPanelOpen(true); };
  const closeEditPanel = () => { setEditPanelOpen(false); setTimeout(() => setEditTrade(null), 300); };
  const handleDialogChange = (open: boolean) => { setDialogOpen(open); if (!open) setEditTrade(null); };

  const handlePayout = async (accountId: string, amount: number, date: string, note: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    // 1. Record the payout
    await addPayout(amount, date, note, accountId);

    // 2. Mark account as paid_out
    const { id: _id, ...rest } = account;
    await onUpdateAccount(accountId, { ...rest, status: 'paid_out' });

    // 3. Create successor account
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
          <p className="text-xs text-muted-foreground">Create an account in the "Accounts" section to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto space-y-6">
      {/* Trades header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Trades</h1>
          <p className="text-xs text-muted-foreground">{activeAccount.name} · {filteredTrades.length}/{trades.length} trade{trades.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'table' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="h-3.5 w-3.5" />Table
            </button>
            <button onClick={() => setView('gallery')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'gallery' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Image className="h-3.5 w-3.5" />Gallery
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

      {/* Filters */}
      <TradeFilters trades={trades} onFiltered={setFilteredTrades} />

      <div className="space-y-6">
        <div className="min-w-0">
          {view === 'list' ? (
            <TradeListView trades={filteredTrades} accounts={accounts} onEdit={handleEdit} onDelete={deleteTrade} />
          ) : view === 'table' ? (
            <TradeTable trades={filteredTrades} onEdit={handleEdit} onDelete={deleteTrade} accounts={accounts} payouts={allPayouts} onDeletePayout={deletePayout} />
          ) : (
            <TradeGallery trades={filteredTrades} />
          )}
        </div>

        {/* Pending Orders — centered panel below the list */}
        <div className="mx-auto w-full max-w-2xl">
          <PendingOrdersSection
            pendingOrders={pendingOrders}
            accounts={accounts}
            activeAccountId={activeAccount.id}
            onAdd={addOrder}
            onUpdate={updateOrder}
            onDelete={deleteOrder}
            onTrigger={triggerOrder}
            onCancel={cancelOrder}
            onAddTrades={addTrades}
          />
        </div>
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

      {/* Backdrop */}
      <div className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${editPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeEditPanel} />

      {/* Right slide-in edit panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-1/3 min-w-[480px] bg-card border-l border-border shadow-[-6px_0_40px_hsl(0_0%_0%/0.45)] transition-transform duration-300 ease-out ${editPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
