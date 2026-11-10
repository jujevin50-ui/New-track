import { describe, expect, it } from 'vitest';
import { accountScope } from './accountScope';
import type { Account } from '@/types/account';
const account=(id:string,currency:string,initialBalance=1000):Account=>({id,currency,initialBalance,name:id,accountCode:'',broker:'',createdAt:'2026-01-01',status:'active',category:'Personal',payoutIntervalDays:0,dailyDrawdownPct:0,maxDrawdownPct:0,riskPct:1});
describe('Shared account filter scope',()=>{
  const accounts=[account('usd1','USD'),account('usd2','USD',2000),account('eur','EUR')];
  it('includes all accounts while keeping monetary totals within one selected currency',()=>{
    const usd=accountScope(accounts,'all',' usd ');expect(usd.accounts.map(account=>account.id)).toEqual(['usd1','usd2']);expect(usd.capital).toBe(3000);expect(usd.groups).toHaveLength(2);
    const eur=accountScope(accounts,'all','EUR');expect(eur.accounts.map(account=>account.id)).toEqual(['eur']);expect(eur.capital).toBe(1000);
  });
  it('isolates a selected account and refuses to aggregate unknown currencies',()=>{
    expect(accountScope(accounts,'usd2','EUR').capital).toBe(2000);
    expect(accountScope([account('a',''),account('b','')],'all').accounts).toEqual([]);
    expect(accountScope(accounts,'missing').accounts).toEqual([]);
  });
});
