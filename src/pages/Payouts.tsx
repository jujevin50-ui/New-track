import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useTrades } from '@/hooks/useTrades';
import { dashboardAnalytics } from '@/lib/dashboardAnalytics';
import { createPayoutData, type PayoutRecord } from '@/lib/payouts';
import { localDay } from '@/lib/discipline';
import type { Account } from '@/types/account';
import DashboardFilter from '@/components/trading/DashboardFilter';
import PayoutDialog from '@/components/trading/PayoutDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Props { accounts:Account[]; activeAccountId:string|null; onSelectAccount:(id:string)=>void; }
export default function Payouts({accounts,activeAccountId,onSelectAccount}:Props) {
  const {data,saveData,updateRow,deleteRow}=useData();
  const {allTrades}=useTrades(activeAccountId,0);
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<PayoutRecord|null>(null);
  const [removing,setRemoving]=useState<PayoutRecord|null>(null);
  const [deleting,setDeleting]=useState(false);
  const [error,setError]=useState('');
  const [year,setYear]=useState('all');
  const [preferredCurrency,setPreferredCurrency]=useState('');
  const [query,setQuery]=useState('');
  const allPayouts=(data.payouts as PayoutRecord[]).map(row=>({...row,amount:Number(row.amount)}));
  const accountName=(row:PayoutRecord)=>accounts.find(account=>account.id===row.accountId)?.name || row.accountName || 'Compte supprimé';
  const rowCurrency=(row:PayoutRecord)=>(row.currency || accounts.find(account=>account.id===row.accountId)?.currency || '').trim().toUpperCase();
  const scoped=allPayouts.filter(row=>activeAccountId==='all'||row.accountId===activeAccountId);
  const currencies=[...new Set([...scoped.map(row=>rowCurrency(row)||'UNKNOWN'),...accounts.filter(account=>activeAccountId==='all'||account.id===activeAccountId).map(account=>account.currency?.trim().toUpperCase()||'UNKNOWN')])].sort();
  const currency=currencies.includes(preferredCurrency) ? preferredCurrency : currencies.find(value=>value===(accounts.find(account=>account.id===activeAccountId)?.currency || accounts[0]?.currency)) || currencies[0] || '';
  const years=[...new Set([...scoped.map(row=>row.date.slice(0,4)),...(year==='all'?[]:[year])])].sort().reverse();
  const filtered=scoped.filter(row=>(rowCurrency(row)||'UNKNOWN')===currency && (year==='all'||row.date.startsWith(year)) && `${accountName(row)} ${row.note}`.toLocaleLowerCase('fr-FR').includes(query.trim().toLocaleLowerCase('fr-FR'))).sort((a,b)=>b.date.localeCompare(a.date));
  const money=(amount:number,unit=currency)=>{try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:unit,maximumFractionDigits:2}).format(amount);}catch{return amount.toLocaleString('fr-FR',{maximumFractionDigits:2});}};
  const total=filtered.reduce((sum,row)=>sum+(Number.isFinite(row.amount)?row.amount:0),0);
  const profits=useMemo(()=>Object.fromEntries(accounts.map(account=>{
    const realized=dashboardAnalytics(allTrades,{accountIds:[account.id],to:localDay()}).netProfit;
    const paid=(data.payouts as PayoutRecord[]).filter(row=>row.accountId===account.id).reduce((sum,row)=>sum+Number(row.amount||0),0);
    return [account.id,Math.max(0,realized-paid)];
  })),[accounts,allTrades,data.payouts]);
  const eligible=accounts.filter(account=>['active','pending'].includes(account.status));
  return <div className="payout-page w-full space-y-8 pb-10"><h1 className="sr-only page-title-hidden">Payout</h1>
    <div className="flex flex-wrap items-end justify-between gap-4"><div className="dashboard-filter-controls"><DashboardFilter label="Compte" ariaLabel="Compte des payouts" value={activeAccountId??'all'} onChange={onSelectAccount} options={[{value:'all',label:'Tous les comptes'},...accounts.map(account=>({value:account.id,label:account.name}))]}/>{currencies.length>1&&<DashboardFilter label="Devise" ariaLabel="Devise des payouts" value={currency} onChange={setPreferredCurrency} options={currencies.map(value=>({value,label:value==='UNKNOWN'?'Non renseignée':value}))}/>}<DashboardFilter label="Année" ariaLabel="Année des payouts" value={year} onChange={setYear} options={[{value:'all',label:'Tout l’historique'},...years.map(value=>({value,label:value}))]}/></div><Button disabled={!eligible.length} className="h-[42px] gap-2 rounded-[10px] text-xs" onClick={()=>{setEditing(null);setOpen(true);}}><Plus className="h-4 w-4"/>Nouveau payout</Button></div>
    <div className="grid grid-cols-3 gap-4 py-3">{[{label:'Total versé',value:currency==='UNKNOWN'?'—':money(total)},{label:'Payouts',value:String(filtered.length)},{label:'Dernier versement',value:filtered[0] ? new Date(`${filtered[0].date}T12:00:00`).toLocaleDateString('fr-FR') : '—'}].map(metric=><div key={metric.label} className="min-w-0 text-center"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-5 break-words text-lg font-semibold tracking-tight tabular-nums sm:text-[27px]">{metric.value}</p></div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-sm font-semibold">Historique des payouts</h2><Input aria-label="Rechercher un payout" placeholder="Compte ou détails…" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 w-full rounded-[10px] bg-transparent text-xs sm:w-72"/></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="text-muted-foreground"><tr>{['Date','Compte','Montant','Détails','Actions'].map(label=><th key={label} className="px-3 pb-5 font-normal">{label}</th>)}</tr></thead><tbody>{filtered.map(row=><tr key={row.id} className="hover:bg-secondary/30"><td className="whitespace-nowrap px-3 py-4">{new Date(`${row.date}T12:00:00`).toLocaleDateString('fr-FR')}</td><td className="px-3 py-4 font-medium">{accountName(row)}</td><td className="whitespace-nowrap px-3 py-4 font-medium tabular-nums text-profit">{money(row.amount,rowCurrency(row))}</td><td className="max-w-sm break-words px-3 py-4 text-muted-foreground">{row.note||'—'}</td><td className="px-3 py-4"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={`Modifier le payout du ${row.date}`} disabled={!accounts.some(account=>account.id===row.accountId)} onClick={()=>{setEditing(row);setOpen(true);}}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label={`Supprimer le payout du ${row.date}`} onClick={()=>{setError('');setRemoving(row);}}><Trash2 className="h-4 w-4 text-muted-foreground"/></Button></div></td></tr>)}</tbody></table>{!filtered.length&&<p className="py-16 text-center text-sm text-muted-foreground">Aucun payout dans cette sélection.</p>}</div>
    <PayoutDialog open={open} onOpenChange={setOpen} accounts={accounts} defaultAccountId={activeAccountId==='all'?undefined:activeAccountId??undefined} accountProfits={profits} payout={editing} onSubmit={async(accountId,amount,date,note,renew)=>{
      if(editing){await updateRow('payouts',editing.id,{amount,date,note});return;}
      const account=accounts.find(account=>account.id===accountId);if(!account) throw new Error('Compte introuvable.');await saveData(createPayoutData(data,account,amount,date,note,renew));
    }}/>
    <AlertDialog open={Boolean(removing)} onOpenChange={value=>{if(!value&&!deleting)setRemoving(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer ce payout ?</AlertDialogTitle><AlertDialogDescription>Le versement sera supprimé de l’historique.</AlertDialogDescription></AlertDialogHeader>{error&&<p role="alert" className="text-sm text-loss">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={async event=>{event.preventDefault();if(!removing||deleting)return;setDeleting(true);try{await deleteRow('payouts',removing.id);setRemoving(null);}catch{setError('Impossible de supprimer le payout.');}finally{setDeleting(false);}}}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
