import DashboardFilter from '@/components/trading/DashboardFilter';
import { localDay } from '@/lib/discipline';
import { useState, useMemo } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { usePayouts, type Payout } from '@/hooks/usePayouts';
import { useData } from '@/contexts/DataContext';
import { Account, AccountFormData } from '@/types/account';
import { Trade, TradeFormData, getNetResult } from '@/types/trade';
import TradeTable from '@/components/trading/TradeTable';
import TradeGallery from '@/components/trading/TradeGallery';
import TradeListView from '@/components/trading/TradeListView';
import TradeFilters from '@/components/trading/TradeFilters';
import { filterTradeList, initialTradeFilters } from '@/lib/tradeFilters';
import AddTradeDialog from '@/components/trading/AddTradeDialog';
import PayoutDialog from '@/components/trading/PayoutDialog';
import { Button } from '@/components/ui/button';
import { Plus, List, Image, Banknote, Download } from 'lucide-react';
import { exportTradesToCSV } from '@/lib/csvImport';

interface TradesPageProps {
  activeAccount: Account | null;
  accounts: Account[];
  onSelectAccount: (id: string) => void;
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

const Trades = ({ activeAccount, accounts, onAddAccount, onUpdateAccount, onSelectAccount }: TradesPageProps) => {
  const { allTrades, addTrade, updateTrade, deleteTrade } = useTrades(
    activeAccount?.id || null,
    activeAccount?.initialBalance || 0
  );

  const { addPayout, deletePayout } = usePayouts(null);
  const { data } = useData();

  const allPayouts = useMemo(
    () => (data.payouts as Payout[] || []).map(p => ({
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
      const acctTrades = allTrades.filter(t => t.accountId === a.id && t.endDate && t.endDate.slice(0,10) <= localDay());
      const profit = acctTrades.reduce((sum, trade) => sum + getNetResult(trade), 0);
      const paid = allPayouts.filter(payout => payout.accountId === a.id).reduce((sum,payout)=>sum+payout.amount,0);

      map[a.id] = Math.max(0, profit - paid);
    });

    return map;
  }, [accounts, allTrades, allPayouts]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [view, setView] = useState<'list' | 'table' | 'gallery'>('table');
  const [status, setStatus] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [filters, setFilters] = useState({...initialTradeFilters});
  const availableAccounts = status === 'all' ? accounts : accounts.filter(account => account.status === status);
  const selectedId = accountFilter === 'all' || !availableAccounts.some(account => account.id === accountFilter) ? 'all' : accountFilter;
  const scopeAccounts = selectedId === 'all' ? availableAccounts : availableAccounts.filter(account => account.id === selectedId);
  const trades = useMemo(() => allTrades.filter(trade => scopeAccounts.some(account => account.id === trade.accountId)), [allTrades, scopeAccounts]);
  const filteredTrades = useMemo(() => filterTradeList(trades,filters), [trades,filters]);
  const scopedPayouts = allPayouts.filter(payout => scopeAccounts.some(account => account.id === payout.accountId));

  const handleSubmit = async (formData: TradeFormData) => {
    if (editTrade) {
      await updateTrade(editTrade.id, formData);
    } else {
      await addTrade(formData);
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditTrade(trade);
    setDialogOpen(true);
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
    a.download = `trades_${selectedId === 'all' ? 'tous_les_comptes' : accounts.find(account => account.id === selectedId)?.name.replace(/\s+/g, '_') || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  if (!activeAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Ajoute un compte pour commencer à enregistrer tes trades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trades-page w-full mx-auto space-y-8 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
        </div>


      </div>

      <TradeFilters trades={trades} filters={filters} onChange={setFilters} actions={
        <div className="trades-actions flex flex-wrap items-center gap-2">
          <div className="dashboard-switch" role="group" aria-label="Vue des trades">{[{value:'table',label:'Tableau',Icon:List},{value:'gallery',label:'Galerie',Icon:Image}].map(({value,label,Icon})=><button type="button" key={value} aria-pressed={view===value} onClick={()=>setView(value as 'table' | 'gallery')} className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>

          <Button size="sm" variant="outline" aria-label="Exporter" title="Exporter" onClick={handleExport} className="trades-action-secondary gap-1.5">
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </Button>

          <Button size="sm" variant="outline" aria-label="Payout" title="Payout" onClick={() => setPayoutOpen(true)} className="trades-action-secondary gap-1.5">
            <Banknote className="h-4 w-4" />
            <span>Payout</span>
          </Button>

          <Button size="sm" disabled={!scopeAccounts.length} onClick={() => { setEditTrade(null); setDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nouveau trade
          </Button>
        </div>
      }>
        <DashboardFilter label="Statut" ariaLabel="Statut des comptes" value={status} onChange={setStatus} options={[{value:'all',label:'Tous'},{value:'active',label:'Actifs'},{value:'pending',label:'En attente'},{value:'terminated',label:'Terminés'},{value:'paid_out',label:'Payout effectué'}]}/>
        <DashboardFilter label="Compte" ariaLabel="Compte des trades" value={selectedId} onChange={id => {setAccountFilter(id); if (id !== 'all') onSelectAccount(id);}} disabled={!availableAccounts.length} options={[{value:'all',label:'Tous les comptes'},...availableAccounts.map(account=>({value:account.id,label:account.name}))]}/>
      </TradeFilters>
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
            payouts={scopedPayouts}
            onDeletePayout={deletePayout}
          />
        ) : (
          <TradeGallery trades={filteredTrades} accounts={accounts} />
        )}
      </div>

      <AddTradeDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        onSubmit={handleSubmit}
        editTrade={editTrade}
        accounts={accounts}
        activeAccountId={selectedId || null}
      />

      <PayoutDialog
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        onSubmit={handlePayout}
        accounts={accounts}
        defaultAccountId={selectedId === 'all' ? undefined : selectedId || undefined}
        accountProfits={accountProfits}
      />
    </div>
  );
};

export default Trades;
