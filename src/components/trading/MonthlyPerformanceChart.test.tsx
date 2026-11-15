import { cloneElement, type ReactElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MonthlyPerformanceChart from './MonthlyPerformanceChart';

vi.mock('recharts', async importOriginal => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: ({ children }: { children: ReactElement }) => cloneElement(children, { width: 600, height: 320 }),
}));
afterEach(cleanup);
const data = [
  { date: '2026-01', performance: 2, rr: 1.5, trades: 2 },
  { date: '2026-02', performance: -1, rr: -0.5, trades: 1 },
  { date: '2026-03', performance: 0, rr: 0, trades: 1 },
  { date: '2026-04', performance: 1, rr: null, trades: 2 },
];

describe('monthly realized performance charts', () => {
  it('renders net returns as percentage bars including losing months', () => {
    const { container } = render(<MonthlyPerformanceChart data={data} validCapital />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('pourcentage du capital initial');
    expect(container.querySelectorAll('.recharts-bar-rectangle path')).toHaveLength(3);
    expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/RR indisponible/)).toBeNull();
  });

  it('keeps zero R and marks missing R without plotting a fabricated zero', () => {
    const { container } = render(<MonthlyPerformanceChart data={data} validCapital metric="rr" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('RR réalisé par mois en R');
    expect(container.querySelectorAll('.recharts-bar-rectangle path')).toHaveLength(2);
    expect(screen.getByText('0 R')).toBeInTheDocument();
    expect(screen.getByText('Indisponible')).toBeInTheDocument();
    expect(screen.getByText(/RR indisponible pour 1 mois/)).toBeInTheDocument();
  });

  it('explains missing capital and empty history', () => {
    const { rerender } = render(<MonthlyPerformanceChart data={data} validCapital={false} />);
    expect(screen.getByText(/capital initial positif/)).toBeInTheDocument();
    rerender(<MonthlyPerformanceChart data={[]} validCapital metric="rr" />);
    expect(screen.getByText(/première clôture/)).toBeInTheDocument();
  });
});
