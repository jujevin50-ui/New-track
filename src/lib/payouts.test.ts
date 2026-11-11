import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA } from './fileStorage';
import { createPayoutData } from './payouts';
import type { Account } from '@/types/account';
const account:Account={id:'a',name:'Compte A',accountCode:'P-1',broker:'Broker',currency:'USD',initialBalance:10000,createdAt:'2026-01-01',status:'active',category:'Prop Firm',riskPct:1,dailyDrawdownPct:5,maxDrawdownPct:10,payoutIntervalDays:30};
describe('Payout recording',()=>{
  it('records a withdrawal with its currency and account name without changing the cycle when disabled',()=>{
    const data={...DEFAULT_DATA,accounts:[account],payouts:[]};
    const next=createPayoutData(data,account,125.5,'2026-01-02',' Versement ',false);
    expect(next.accounts).toBe(data.accounts);
    expect(next.payouts[0]).toMatchObject({accountId:'a',amount:125.5,date:'2026-01-02',note:'Versement',currency:'USD',accountName:'Compte A'});
    expect(data.payouts).toHaveLength(0);
  });
  it('creates one atomic payout and cycle update, avoiding account code collisions',()=>{
    const data={...DEFAULT_DATA,accounts:[account,{...account,id:'b',accountCode:'P-2'}],payouts:[]};
    const next=createPayoutData(data,account,200,'2026-01-02','',true);
    expect(next.payouts).toHaveLength(1);expect(next.accounts).toHaveLength(3);
    expect(next.accounts.find(item=>item.id==='a').status).toBe('paid_out');
    expect(next.accounts[2]).toMatchObject({accountCode:'P-3',status:'active',createdAt:'2026-01-02',initialBalance:10000});
    expect(next.accounts[2].id).not.toBe(account.id);expect(account.status).toBe('active');expect(data.accounts).toHaveLength(2);
  });
  it('refuses invalid amounts, nonexistent accounts and invalid dates without changing the source',()=>{
    const data={...DEFAULT_DATA,accounts:[account],payouts:[]};
    for(const value of [0,-1,NaN,Infinity]) expect(()=>createPayoutData(data,account,value,'2026-01-02','',true)).toThrow();
    expect(()=>createPayoutData(data,account,100,'2026-02-30','',true)).toThrow();
    expect(()=>createPayoutData(data,{...account,id:'missing'},100,'2026-01-02','',true)).toThrow();
    expect(data.payouts).toHaveLength(0);expect(data.accounts[0].status).toBe('active');
  });
});
