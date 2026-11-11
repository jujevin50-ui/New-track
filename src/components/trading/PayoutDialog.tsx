import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import DashboardFilter from './DashboardFilter';
import { Loader2 } from 'lucide-react';
import type { Account } from '@/types/account';
import type { PayoutRecord } from '@/lib/payouts';
import { localDay } from '@/lib/discipline';

interface Props { open:boolean; onOpenChange:(open:boolean)=>void; onSubmit:(accountId:string,amount:number,date:string,note:string,renew:boolean)=>Promise<void>; accounts:Account[]; defaultAccountId?:string; accountProfits?:Record<string,number>; payout?:PayoutRecord | null; }
export default function PayoutDialog({open,onOpenChange,onSubmit,accounts,defaultAccountId,accountProfits={},payout}:Props) {
  const [accountId,setAccountId]=useState('');
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(localDay());
  const [note,setNote]=useState('');
  const [renew,setRenew]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const busy=useRef(false);
  const eligible=accounts.filter(account=>['active','pending'].includes(account.status) || account.id===payout?.accountId);
  const selected=accounts.find(account=>account.id===accountId);
  const currency=payout?.currency || selected?.currency || '';
  const profit=accountProfits[accountId] ?? 0;
  useEffect(()=>{
    if(!open) return;
    const account=payout?.accountId || (eligible.some(account=>account.id===defaultAccountId) ? defaultAccountId! : eligible[0]?.id || '');
    setAccountId(account);setAmount(payout ? String(payout.amount) : (accountProfits[account]??0)>0 ? accountProfits[account].toFixed(2) : '');setDate(payout?.date ?? localDay());setNote(payout?.note ?? '');setRenew(true);setError('');
    // A draft is initialized only on opening, never overwritten by account updates during saving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,payout?.id]);
  return <Dialog open={open} onOpenChange={value=>{if(!busy.current) onOpenChange(value);}}><DialogContent className="payout-editor w-[calc(100vw-32px)] max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{payout ? 'Modifier le payout' : 'Nouveau payout'}</DialogTitle></DialogHeader><form className="space-y-5" onSubmit={async event=>{
    event.preventDefault();if(busy.current) return;const value=Number(amount.replace(',','.'));if(!Number.isFinite(value)||value<=0||!accountId||!date||date>localDay()){setError('Vérifie le compte, le montant et la date.');return;}
    busy.current=true;setSaving(true);setError('');try{await onSubmit(accountId,value,date,note,!payout&&renew);onOpenChange(false);}catch(cause){setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le payout.');}finally{busy.current=false;setSaving(false);}
  }}><fieldset disabled={saving} className="min-w-0 space-y-5">
    <DashboardFilter label="Compte" ariaLabel="Compte du payout" value={accountId} disabled={Boolean(payout)||saving} onChange={id=>{setAccountId(id);setAmount((accountProfits[id]??0)>0 ? accountProfits[id].toFixed(2) : '');}} options={eligible.map(account=>({value:account.id,label:account.name}))}/>
    <div className="grid grid-cols-2 items-end gap-4"><div className="space-y-2"><Label htmlFor="payout-amount" className="text-xs text-muted-foreground">Montant {currency ? `(${currency})` : ''}</Label><Input id="payout-amount" type="text" inputMode="decimal" required value={amount} onChange={event=>setAmount(event.target.value)} className="h-[42px] rounded-[10px] bg-transparent"/></div><div className="space-y-2"><Label htmlFor="payout-date" className="text-xs text-muted-foreground">Date</Label><Input id="payout-date" type="date" required max={localDay()} value={date} onChange={event=>setDate(event.target.value)} className="h-[42px] min-w-0 rounded-[10px] bg-transparent text-xs"/></div></div>
    {!payout&&profit>0 && <button type="button" onClick={()=>setAmount(profit.toFixed(2))} className="text-xs text-primary">Utiliser le profit disponible : {profit.toLocaleString('fr-FR',{maximumFractionDigits:2})} {currency}</button>}
    <div className="space-y-2"><Label htmlFor="payout-note" className="text-xs text-muted-foreground">Détails</Label><Textarea id="payout-note" value={note} onChange={event=>setNote(event.target.value)} className="min-h-28 rounded-[10px] bg-transparent text-sm"/></div>
    {!payout&&<label className="flex cursor-pointer items-start gap-3 text-xs leading-5"><Checkbox checked={renew} onCheckedChange={value=>setRenew(value===true)} className="mt-0.5"/>Clôturer ce cycle et créer le compte suivant</label>}
    {error&&<p role="alert" className="text-sm text-loss">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={()=>onOpenChange(false)}>Annuler</Button><Button type="submit" disabled={saving||!accountId||!amount} className="gap-2">{saving&&<Loader2 className="h-4 w-4 animate-spin"/>}Enregistrer le payout</Button></div>
  </fieldset></form></DialogContent></Dialog>;
}
