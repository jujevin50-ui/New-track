import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TradeTable from './TradeTable';
import type { Trade } from '@/types/trade';
import type { Account } from '@/types/account';

afterEach(cleanup);
it('places net totals after the rows, excluding open trades and separating currencies', () => {
  const trade: Trade = { id:'win', tradeNumber:1, accountId:'eur', date:'2026-11-01', endDate:'2026-11-02', pair:'EURUSD', type:'Buy', result:100, commission:-5, swap:-2, exitType:'TP', setupQuality:2, riskPercent:1, strategyRespected:true };
  const accounts = [{id:'eur',currency:'EUR',initialBalance:10000}, {id:'usd',currency:'USD',initialBalance:5000}] as Account[];
  const loss = {...trade, id:'loss', tradeNumber:10, date:'2026-10-31', result:-20, strategyRespected:false};
  const open = {...trade, id:'open', tradeNumber:2, date:'2026-11-04', endDate:'', result:999};
  const {container, rerender} = render(<TradeTable trades={[trade, loss, open, {...trade,id:'usd',tradeNumber:3,accountId:'usd',result:50}]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  const tradeNumbers = () => Array.from(container.querySelectorAll('tbody tr > td:first-child'), cell => cell.textContent);
  expect(tradeNumbers()).toEqual(['#0010', '#0003', '#0002', '#0001']);
  expect(screen.getByRole('columnheader', {name:'#'})).toHaveAttribute('aria-sort', 'descending');
  const footer = container.querySelector('tfoot')!;
  expect(footer.previousElementSibling?.tagName).toBe('TBODY');
  expect(within(footer).getByText(/Total net/)).toBeInTheDocument();
  expect(footer).toHaveTextContent('Période 31/10/2026 – 04/11/2026');
  expect(within(footer).getByLabelText('Respect de la stratégie sur les trades clôturés')).toHaveTextContent('66,67 %');
  expect(footer).toHaveTextContent('+66,00');
  expect(footer).toHaveTextContent('+43,00');
  expect(within(footer).getByLabelText('Total %')).toHaveTextContent('+0,66 %');
  expect(within(footer).getByLabelText('Total %')).toHaveTextContent('+0,86 %');
  expect(within(footer).getByLabelText('Total RR')).toHaveTextContent('+0,66R');
  expect(within(footer).getByLabelText('Total RR')).toHaveTextContent('+0,86R');
  expect(footer).toHaveTextContent('€');
  expect(footer).toHaveTextContent('$US');
  rerender(<TradeTable trades={[trade, loss]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(tradeNumbers()).toEqual(['#0010', '#0001']);
  expect(container.querySelector('tfoot')).toHaveTextContent('+66,00');
  expect(footer).toHaveTextContent('Période 31/10/2026 – 02/11/2026');
  expect(within(footer).getByLabelText('Respect de la stratégie sur les trades clôturés')).toHaveTextContent('50 %');
  rerender(<TradeTable trades={[trade]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(container.querySelector('tfoot')).toHaveTextContent('+93,00');
  expect(screen.queryByText('+66,00')).not.toBeInTheDocument();
  rerender(<TradeTable trades={[open]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(footer).toHaveTextContent('Période 04/11/2026');
  expect(within(footer).getByLabelText('Respect de la stratégie sur les trades clôturés')).toHaveTextContent('—');
});

it('shows dashes when balance and risk are missing', () => {
  const trade = {id:'unknown',tradeNumber:1,accountId:'missing',date:'2026-11-01',endDate:'2026-11-02',pair:'EURUSD',type:'Buy',result:10,commission:0,swap:0,exitType:'TP',setupQuality:1,strategyRespected:true} as Trade;
  render(<TradeTable trades={[trade]} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(screen.getByLabelText('Total %')).toHaveTextContent('—');
  expect(screen.getByLabelText('Total RR')).toHaveTextContent('—');
});
