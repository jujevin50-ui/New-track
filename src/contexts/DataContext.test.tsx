import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DataProvider, useData } from './DataContext';
import { DEFAULT_DATA, normalizeData, readLocalData, writeLocalData } from '@/lib/fileStorage';
import type { StrategyDocument } from '@/lib/strategyDocuments';

const document: StrategyDocument = {
  id: 'doc-1', name: 'Plan.pdf', kind: 'pdf', size: 5,
  createdAt: '2026-11-04T12:00:00Z', content: 'JVBERi0=',
};

function Probe() {
  const { data, status, addRow } = useData();
  const [error, setError] = useState('');
  return <>
    <p>{status}</p><p data-testid="count">{data.strategyDocuments.length}</p>
    <button onClick={async () => {
      try { await addRow('strategyDocuments', document); }
      catch { setError('Échec de sauvegarde'); }
    }}>Importer</button>
    {error && <p role="alert">{error}</p>}
  </>;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Strategy document persistence', () => {
  it('opens older data files with an empty document library and preserves their trades', () => {
    const trades = [{ id: 'trade-1', notes: 'À conserver' }];
    const normalized = normalizeData({ version: 1, trades });
    expect(normalized.strategyDocuments).toEqual([]);
    expect(normalized.trades).toEqual(trades);
  });

  it('persists the full original document through the existing data provider', async () => {
    writeLocalData({ ...DEFAULT_DATA });
    render(<DataProvider><Probe /></DataProvider>);
    await screen.findByText('connected');
    fireEvent.click(screen.getByText('Importer'));
    await waitFor(() => expect(readLocalData()?.strategyDocuments).toEqual([document]));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('reports storage errors and rolls back a failed import', async () => {
    writeLocalData({ ...DEFAULT_DATA });
    render(<DataProvider><Probe /></DataProvider>);
    await screen.findByText('connected');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    fireEvent.click(screen.getByText('Importer'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Échec de sauvegarde');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(readLocalData()?.strategyDocuments).toEqual([]);
  });
});
