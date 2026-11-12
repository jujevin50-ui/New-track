import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TradeTable from './TradeTable';
import type { Trade } from '@/types/trade';
import type { Account } from '@/types/account';

afterEach(cleanup);
it('places net totals after the rows, excluding open trades and separating currencies', () => {
  const trade: Trade = { id:'win', tradeNumber:1, accountId:'eur', date:'2026-11-01', endDate:'2026-11-02', pair:'EURUSD', type:'Buy', result:100, commission:-5, swap:-2, exitType:'TP', setupQuality:2, strategyRespected:true };
  const accounts = [{id:'eur',currency:'EUR'}, {id:'usd',currency:'USD'}] as Account[];
  const {container, rerender} = render(<TradeTable trades={[trade, {...trade,id:'loss',result:-20}, {...trade,id:'open',endDate:'',result:999}, {...trade,id:'usd',accountId:'usd',result:50}]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  const footer = container.querySelector('tfoot')!;
  expect(footer.previousElementSibling?.tagName).toBe('TBODY');
  expect(within(footer).getByText(/Total net/)).toBeInTheDocument();
  expect(footer).toHaveTextContent('+66,00');
  expect(footer).toHaveTextContent('+43,00');
  expect(footer).toHaveTextContent('€');
  expect(footer).toHaveTextContent('$US');
  rerender(<TradeTable trades={[trade]} accounts={accounts} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(container.querySelector('tfoot')).toHaveTextContent('+93,00');
  expect(screen.queryByText('+66,00')).not.toBeInTheDocument();
});
