import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import AddTradeDialog from './AddTradeDialog';
import type { Account } from '@/types/account';
import type { Trade, TradeFormData } from '@/types/trade';

const account: Account = {
  id: 'account-1', name: 'Trading', accountCode: '', broker: 'Demo',
  initialBalance: 10000, currency: 'EUR', createdAt: '2026-01-01',
  status: 'active', category: 'Demo', payoutIntervalDays: 30,
  dailyDrawdownPct: 5, maxDrawdownPct: 10, riskPct: 1,
};

const trade: Trade = {
  id: 'trade-1', tradeNumber: 1, accountId: account.id, date: '2026-01-02',
  endDate: '2026-01-03', pair: 'EURUSD', type: 'Buy', result: 100,
  commission: -5, swap: -2, exitType: 'TP', setupQuality: 2,
  strategyRespected: true, notes: 'Plan initial',
  screenshot: 'data:image/png;base64,capture',
};

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

// JSDOM has no layout engine; Radix observes the switch's size in the browser.
beforeAll(() => vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
}));
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

describe('Trade entry', () => {
  it('saves decimal amounts, costs and journal data from the all-accounts view', async () => {
    const onSubmit = vi.fn<(data: TradeFormData) => void>();
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} accounts={[account]} activeAccountId="all" />);
    fill('P&L brut (EUR)', '250,50');
    fill('Risque (%)', '1');
    fireEvent.click(screen.getByText('Commission & swap'));
    fill('Commission (EUR)', '5,50');
    fill('Swap (EUR)', '-2,50');
    fireEvent.click(screen.getByRole('button', { name: 'Short' }));
    fireEvent.click(screen.getByRole('button', { name: '3 étoiles' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Plan respecté' }));
    fill('Notes', 'Retest de la zone');
    expect(screen.getByRole('status')).toHaveTextContent('+242,50');
    expect(screen.getByRole('status')).toHaveTextContent('+2.42R');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le trade' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      accountId: account.id, result: 250.5, commission: 5.5, swap: -2.5,
      riskPercent: 1, type: 'Sell', setupQuality: 3, strategyRespected: false,
      notes: 'Retest de la zone',
    });
  });

  it('edits existing costs and can remove the final legacy capture without restoring it', async () => {
    const onSubmit = vi.fn<(data: TradeFormData) => void>();
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} editTrade={trade} accounts={[account]} activeAccountId={account.id} />);
    expect(screen.getByLabelText('Commission (EUR)')).toHaveValue('5');
    expect(screen.getByLabelText('Clôture')).toHaveValue('2026-01-03');
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la capture 1' }));
    fill('Notes', 'Note modifiée');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      result: 100, commission: 5, swap: -2, screenshots: [],
      screenshot: undefined, notes: 'Note modifiée',
    });
  });

  it('keeps the form open and preserves input if saving fails', async () => {
    const onOpenChange = vi.fn();
    render(<AddTradeDialog open onOpenChange={onOpenChange} onSubmit={vi.fn().mockRejectedValue(new Error('Écriture impossible'))} accounts={[account]} activeAccountId={account.id} />);
    fill('P&L brut (EUR)', '-20');
    fill('Notes', 'À conserver');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le trade' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Écriture impossible');
    expect(screen.getByLabelText('Notes')).toHaveValue('À conserver');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('blocks submission while the previous save is pending', async () => {
    let complete: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    const onOpenChange = vi.fn();
    render(<AddTradeDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} accounts={[account]} activeAccountId={account.id} />);
    fill('P&L brut (EUR)', '0');
    const submit = screen.getByRole('button', { name: 'Ajouter le trade' });
    fireEvent.click(submit);
    expect(submit).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
    complete();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('rejects an impossible risk without losing the form', async () => {
    const onSubmit = vi.fn<(data: TradeFormData) => void>();
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} accounts={[account]} activeAccountId={account.id} />);
    fill('P&L brut (EUR)', '10');
    fill('Risque (%)', '101');
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le trade' }));
    expect(screen.getByRole('alert')).toHaveTextContent('100 %');
    expect(onSubmit).not.toHaveBeenCalled();
    fill('Risque (%)', '1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
