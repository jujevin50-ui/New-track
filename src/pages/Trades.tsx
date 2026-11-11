import DashboardFilter from '@/components/trading/DashboardFilter';
import { useState, useMemo } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { Account } from '@/types/account';
import { Trade, TradeFormData } from '@/types/trade';
import TradeTable from '@/components/trading/TradeTable';
import TradeGallery from '@/components/trading/TradeGallery';
import TradeListView from '@/components/trading/TradeListView';
import TradeFilters from '@/components/trading/TradeFilters';
import { filterTradeList, initialTradeFilters } from '@/lib/tradeFilters';
import AddTradeDialog from '@/components/trading/AddTradeDialog';
import { Button } from '@/components/ui/button';
import { Plus, List, Image, Download } from 'lucide-react';
import { exportTradesToCSV } from '@/lib/csvImport';

interface TradesPageProps {
  activeAccount: Account | null;
  accounts: Account[];
  onSelectAccount: (id: string) => void;
}

const Trades = ({ activeAccount, accounts, onSelectAccount }: TradesPageProps) => {
  const { allTrades, addTrade, updateTrade, deleteTrade } = useTrades(
    activeAccount?.id || null,
    activeAccount?.initialBalance || 0
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [view, setView] = useState<'list' | 'table' | 'gallery'>('table');
  const [status, setStatus] = useState('all');
  const [filters, setFilters] = useState({...initialTradeFilters});
  const availableAccounts = status === 'all' ? accounts : accounts.filter(account => account.status === status);
  const selectedId = activeAccount?.id ?? 'all';
  const scopeAccounts = selectedId === 'all' ? availableAccounts : availableAccounts.filter(account => account.id === selectedId);
  const trades = useMemo(() => allTrades.filter(trade => scopeAccounts.some(account => account.id === trade.accountId)), [allTrades, scopeAccounts]);
  const filteredTrades = useMemo(() => filterTradeList(trades,filters), [trades,filters]);


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
      <h1 className="sr-only page-title-hidden">Trades</h1>
      <TradeFilters trades={trades} filters={filters} onChange={setFilters} actions={
        <div className="trades-actions flex flex-wrap items-center gap-2">
          <div className="dashboard-switch" role="group" aria-label="Vue des trades">{[{value:'table',label:'Tableau',Icon:List},{value:'gallery',label:'Galerie',Icon:Image}].map(({value,label,Icon})=><button type="button" key={value} aria-pressed={view===value} onClick={()=>setView(value as 'table' | 'gallery')} className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>

          <Button size="sm" variant="outline" aria-label="Exporter" title="Exporter" onClick={handleExport} className="trades-action-secondary gap-1.5">
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </Button>



          <Button size="sm" disabled={!scopeAccounts.length} onClick={() => { setEditTrade(null); setDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nouveau trade
          </Button>
        </div>
      }>
        <DashboardFilter label="Statut" ariaLabel="Statut des comptes" value={status} onChange={setStatus} options={[{value:'all',label:'Tous'},{value:'active',label:'Actifs'},{value:'pending',label:'En attente'},{value:'terminated',label:'Terminés'},{value:'paid_out',label:'Cycle clôturé'}]}/>
        <DashboardFilter label="Compte" ariaLabel="Compte des trades" value={selectedId} onChange={id => {setStatus('all'); onSelectAccount(id);}} disabled={!accounts.length} options={[{value:'all',label:'Tous les comptes'},...accounts.map(account=>({value:account.id,label:account.name}))]}/>
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


    </div>
  );
};

export default Trades;
