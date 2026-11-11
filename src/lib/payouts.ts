import type { Account } from '@/types/account';
import type { AppData } from './fileStorage';
import { localDay } from './discipline';

export interface PayoutRecord { id:string; accountId:string; amount:number; date:string; note:string; currency?:string; accountName?:string; }
export function createPayoutData(data:AppData, account:Account, amount:number, date:string, note:string, renewCycle:boolean):AppData {
  if (!Number.isFinite(amount) || amount<=0) throw new Error('Le montant doit être positif.');
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==date || date>localDay()) throw new Error('Choisis une date de versement valide.');
  if (!data.accounts.some(item=>item.id===account.id) || !['active','pending'].includes(account.status)) throw new Error('Choisis un compte actif ou en attente.');
  const payout:PayoutRecord={id:crypto.randomUUID(),accountId:account.id,amount,date,note:note.trim(),currency:account.currency.trim().toUpperCase(),accountName:account.name};
  let nextAccounts=data.accounts;
  if(renewCycle) {
    const base=account.accountCode?.replace(/-\d+$/,'') || '';
    const existing=new Set(data.accounts.map(item=>item.accountCode));
    let suffix=1;
    while(existing.has(`${base}-${suffix}`)) suffix++;
    const successor={...account,id:crypto.randomUUID(),accountCode:base ? `${base}-${suffix}` : '',status:'active',createdAt:date};
    nextAccounts=[...data.accounts.map(item=>item.id===account.id ? {...item,status:'paid_out'} : item),successor];
  }
  return {...data,accounts:nextAccounts,payouts:[...data.payouts,payout]};
}
