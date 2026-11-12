import { describe, expect, it } from 'vitest';
import { filterTradeList, initialTradeFilters } from './tradeFilters';
import type { Trade } from '@/types/trade';
const trade=(id:string,result:number,extra:Partial<Trade>={}):Trade=>({id,tradeNumber:1,date:'2026-11-02',endDate:'2026-11-03',pair:'EURUSD',type:'Buy',result,commission:0,swap:0,exitType:'TP',setupQuality:2,strategyRespected:true,accountId:'a',...extra});
describe('Trade filters',()=>{
  it('filters exact star ratings and combines them with other filters',()=>{
    const input=[trade('one',10,{setupQuality:1}),trade('two',10),trade('three',10,{setupQuality:3}),trade('loss',-10,{setupQuality:3})];
    for (const [quality,id] of [['1','one'],['2','two'],['3','three']]) {
      expect(filterTradeList(input,{...initialTradeFilters,quality,result:'win'}).map(t=>t.id)).toEqual([id]);
    }
    expect(filterTradeList(input,initialTradeFilters)).toHaveLength(4);
    const {quality,...legacyFilters}=initialTradeFilters;
    expect(filterTradeList(input,legacyFilters)).toHaveLength(4);
  });
  it('uses absolute commissions and signed swaps, separating open positions and breakevens',()=>{
    const input=[trade('win',10,{commission:-5,swap:2}),trade('loss',10,{commission:5,swap:-8}),trade('neutral',10,{commission:10}),trade('open',999,{endDate:''})];
    expect(filterTradeList(input,{...initialTradeFilters,result:'win'}).map(t=>t.id)).toEqual(['win']);
    expect(filterTradeList(input,{...initialTradeFilters,result:'loss'}).map(t=>t.id)).toEqual(['loss']);
    expect(filterTradeList(input,{...initialTradeFilters,result:'neutral'}).map(t=>t.id)).toEqual(['neutral']);
    expect(filterTradeList(input,{...initialTradeFilters,position:'open'}).map(t=>t.id)).toEqual(['open']);
    expect(filterTradeList(input,{...initialTradeFilters})).toHaveLength(4);
  });
  it('combines entry dates, pair and strategy without mutating trades',()=>{
    const input=[trade('1',10),trade('2',10,{strategyRespected:false}),trade('3',10,{pair:'XAUUSD'}),trade('4',10,{date:'2026-11-04'})];
    expect(filterTradeList(input,{...initialTradeFilters,pair:'EURUSD',strategy:'yes',from:'2026-11-02',to:'2026-11-02'}).map(t=>t.id)).toEqual(['1']);
    expect(input).toHaveLength(4);
  });
});
