import { Toaster } from 'sonner';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  it('saves an open trade without a result and only requires the result after closure', async () => {
    const onSubmit = vi.fn<(data: TradeFormData) => void>();
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} accounts={[account]} activeAccountId={account.id} />);
    const result = screen.getByLabelText('P&L brut (EUR)');
    expect(result).not.toBeRequired();
    expect(screen.getByText('En cours')).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Sortie' })).not.toBeInTheDocument();

    fill('Ouverture', '2026-01-02');
    fill('Clôture', '2026-01-03');
    expect(result).toBeRequired();
    expect(screen.getByRole('group', { name: 'Sortie' })).toBeVisible();

    fill('Clôture', '');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ endDate: '', result: 0 })));
  });

  it('opens captures in the viewer and returns to the trade draft on Escape', async () => {
    const onOpenChange = vi.fn();
    const screenshots = ['data:image/png;base64,first', 'data:image/png;base64,second'];
    render(<AddTradeDialog open onOpenChange={onOpenChange} onSubmit={vi.fn()} editTrade={{ ...trade, screenshots }} accounts={[account]} activeAccountId={account.id} />);

    fill('Note', 'Contexte en cours');
    const trigger = screen.getByRole('button', { name: 'Agrandir la capture 1' });
    fireEvent.click(trigger);
    const viewer = screen.getByRole('dialog', { name: 'Capture 1 sur 2' });
    expect(within(viewer).getByRole('img')).toHaveAttribute('src', screenshots[0]);

    fireEvent.keyDown(viewer, { key: 'ArrowRight' });
    expect(viewer).toHaveAccessibleName('Capture 2 sur 2');
    expect(within(viewer).getByRole('img')).toHaveAttribute('src', screenshots[1]);
    fireEvent.keyDown(viewer, { key: 'Escape' });

    await waitFor(() => expect(viewer).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByLabelText('Note')).toHaveValue('Contexte en cours');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

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
    fill('Note', 'Retest de la zone');
    expect(screen.getByRole('status')).toHaveTextContent('+242,50');
    expect(screen.getByRole('status')).toHaveTextContent('+2.42R');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
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
    fill('Note', 'Note modifiée');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      result: 100, commission: 5, swap: -2, screenshots: [],
      screenshot: undefined, notes: 'Note modifiée',
    });
  });

  it('retains the submitted values for retry after a background save fails', async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn<(data: TradeFormData) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Écriture impossible')).mockResolvedValue(undefined);
    render(<><Toaster /><AddTradeDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} accounts={[account]} activeAccountId={account.id} /></>);
    fill('P&L brut (EUR)', '-20');
    fill('Note', 'À conserver');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Impossible d’enregistrer le trade.')).toBeVisible();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0]).toMatchObject({ notes: 'À conserver', result: -20 });
  });

  it('shows the green confirmation immediately and closes before the write finishes', async () => {
    let complete: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    const onOpenChange = vi.fn();
    render(<AddTradeDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} accounts={[account]} activeAccountId={account.id} />);
    fill('P&L brut (EUR)', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    const accepted = screen.getByRole('button', { name: 'Pris en compte' });
    expect(accepted).toHaveAttribute('data-feedback', 'success');
    expect(accepted).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onSubmit).toHaveBeenCalledOnce();
    complete();
  });

  it('rejects an impossible risk without losing the form', async () => {
    const onSubmit = vi.fn<(data: TradeFormData) => void>();
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} accounts={[account]} activeAccountId={account.id} />);
    fill('P&L brut (EUR)', '10');
    fill('Risque (%)', '101');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByRole('alert')).toHaveTextContent('100 %');
    expect(onSubmit).not.toHaveBeenCalled();
    fill('Risque (%)', '1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Clipboard image button', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('adds a clipboard image to existing captures in one click and saves it', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read: vi.fn().mockResolvedValue([{ types: ['image/png'], getType: vi.fn().mockResolvedValue(new Blob(['image'], { type: 'image/png' })) }]) } });
    const onSubmit = vi.fn();
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} editTrade={trade} accounts={[account]} activeAccountId={account.id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Coller une image' }));
    expect(await screen.findByAltText('Capture 2')).toBeInTheDocument();
    expect(screen.getByAltText('Capture 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].screenshots).toEqual([trade.screenshot, expect.stringMatching(/^data:image\/png;base64,/)]);
  });
  it('explains empty and denied clipboard access without changing captures', async () => {
    const read = vi.fn().mockResolvedValue([{ types: ['text/plain'] }]);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read } });
    render(<AddTradeDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} accounts={[account]} activeAccountId={account.id} />);
    fireEvent.click(screen.getByRole('button', { name: 'Coller une image' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucune image');
    read.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    fireEvent.click(screen.getByRole('button', { name: 'Coller une image' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ctrl + V'));
    expect(screen.queryByAltText('Capture 1')).not.toBeInTheDocument();
  });
});
