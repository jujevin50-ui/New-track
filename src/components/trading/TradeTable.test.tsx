import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TradeTable from './TradeTable';
import type { Trade } from '@/types/trade';
import type { Account } from '@/types/account';

afterEach(cleanup);
it('places net totals after the rows, excluding open trades and separating currencies', () => {
  const trade: Trade = { id:'win', tradeNumber:1, accountId:'eur', date:'2026-11-01', endDate:'2026-11-02', pair:'EURUSD', type:'Buy', result:100, commission:-5, swap:-2, exitType:'TP', setupQuality:2, riskPercent:1, strategyRespected:true };
  const accounts = [{id:'eur',currency:'EUR',initialBalance:10000}, {id:'usd',currency:'USD',initialBalance:5000}] as Account[];
  const {container, rerender} = render(<TradeTable trades={[trade, {...trade,id:'loss',result:-20}, {...trade,id:'open',endDate:'',result:999}, {...trade,id:'usd',accountId:'usd',result:50}]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  const footer = container.querySelector('tfoot')!;
  expect(footer.previousElementSibling?.tagName).toBe('TBODY');
  expect(within(footer).getByText(/Total net/)).toBeInTheDocument();
  expect(footer).toHaveTextContent('+66,00');
  expect(footer).toHaveTextContent('+43,00');
  expect(within(footer).getByLabelText('Total %')).toHaveTextContent('+0,66 %');
  expect(within(footer).getByLabelText('Total %')).toHaveTextContent('+0,86 %');
  expect(within(footer).getByLabelText('Total RR')).toHaveTextContent('+0,66R');
  expect(within(footer).getByLabelText('Total RR')).toHaveTextContent('+0,86R');
  expect(footer).toHaveTextContent('€');
  expect(footer).toHaveTextContent('$US');
  rerender(<TradeTable trades={[trade]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(container.querySelector('tfoot')).toHaveTextContent('+93,00');
  expect(screen.queryByText('+66,00')).not.toBeInTheDocument();
});

it('shows dashes when balance and risk are missing', () => {
  const trade = {id:'unknown',tradeNumber:1,accountId:'missing',date:'2026-11-01',endDate:'2026-11-02',pair:'EURUSD',type:'Buy',result:10,commission:0,swap:0,exitType:'TP',setupQuality:1,strategyRespected:true} as Trade;
  render(<TradeTable trades={[trade]} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(screen.getByLabelText('Total %')).toHaveTextContent('—');
  expect(screen.getByLabelText('Total RR')).toHaveTextContent('—');
});
