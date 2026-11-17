import { cloneElement, type ReactElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradePerformanceChart from './TradePerformanceChart';

vi.mock('recharts', async importOriginal => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: ({ children }: { children: ReactElement }) => cloneElement(children, { width: 600, height: 320 }),
}));
afterEach(cleanup);
const data = [
  { id: '1', tradeNumber: 1, pair: 'EURUSD', date: '2026-01-02', performance: 2, rr: 1.5 },
  { id: '2', tradeNumber: 2, pair: 'EURUSD', date: '2026-01-02', performance: -1, rr: -0.5 },
  { id: '3', tradeNumber: 3, pair: 'EURUSD', date: '2026-01-02', performance: 0, rr: 0 },
  { id: '4', tradeNumber: 4, pair: 'EURUSD', date: '2026-01-02', performance: 1, rr: null },
];

describe('per-trade realized performance charts', () => {
  it('renders net returns as percentage bars including losing trades', () => {
    const { container } = render(<TradePerformanceChart data={data} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('pourcentage du capital initial');
    expect(container.querySelectorAll('.recharts-bar-rectangle path')).toHaveLength(3);
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/RR indisponible/)).toBeNull();
  });

  it('keeps zero R and marks missing R without plotting a fabricated zero', () => {
    const { container } = render(<TradePerformanceChart data={data} metric="rr" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('RR réalisé de chaque trade clôturé en R');
    expect(container.querySelectorAll('.recharts-bar-rectangle path')).toHaveLength(2);
    expect(screen.getByText('0 R')).toBeInTheDocument();
    expect(screen.getByText('Indisponible')).toBeInTheDocument();
    expect(screen.getByText(/RR réalisé indisponible pour 1 trade/)).toBeInTheDocument();
  });

  it('explains empty history', () => {
    render(<TradePerformanceChart data={[]} metric="rr" />);
    expect(screen.getByText(/premiers trades clôturés/)).toBeInTheDocument();
  });
});

it('fits every available trade across the full width, including zero, without empty slots', () => {
  const many = Array.from({ length: 80 }, (_, index) => ({ ...data[index % data.length], id: `trade-${index}`, tradeNumber: index + 1 }));
  const { container } = render(<TradePerformanceChart data={many} metric="rr" fullWidth />);
  expect(screen.getByText(/60 trade\(s\) affiché/)).toBeInTheDocument();
  expect(container.querySelectorAll('.recharts-bar-rectangle path')).toHaveLength(60);
  expect(screen.queryByText('Indisponible')).not.toBeInTheDocument();
  expect(screen.getByRole('img').style.minWidth).toBe('0');
});
it('explains when none of the selected trades has the requested metric', () => {
  render(<TradePerformanceChart data={[data[3]]} metric="rr" fullWidth />);
  expect(screen.getByText(/Aucun trade avec un RR calculable/)).toBeInTheDocument();
});
