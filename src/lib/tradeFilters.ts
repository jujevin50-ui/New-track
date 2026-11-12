import { getNetResult, type Trade } from '@/types/trade';

export interface TradeFilterState { quality?: string; pair: string; direction: string; result: string; position: string; exit: string; strategy: string; from: string; to: string; }
export const initialTradeFilters: TradeFilterState = {quality:'all', pair:'all', direction:'all', result:'all', position:'all', exit:'all', strategy:'all', from:'', to:''};
export function filterTradeList(trades: Trade[], filters: TradeFilterState) {
  return trades.filter(trade => {
    const net = getNetResult(trade);
    const day = trade.date.slice(0,10);
    return (filters.pair === 'all' || trade.pair === filters.pair)
      && (!filters.quality || filters.quality === 'all' || trade.setupQuality === Number(filters.quality))
      && (filters.direction === 'all' || trade.type === filters.direction)
      && (filters.position === 'all' || (filters.position === 'open' ? !trade.endDate : Boolean(trade.endDate)))
      && (filters.result === 'all' || Boolean(trade.endDate) && (filters.result === 'win' ? net > 0 : filters.result === 'loss' ? net < 0 : net === 0))
      && (filters.exit === 'all' || Boolean(trade.endDate) && trade.exitType === filters.exit)
      && (filters.strategy === 'all' || trade.strategyRespected === (filters.strategy === 'yes'))
      && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
  });
}
