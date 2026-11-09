import { describe, expect, it } from 'vitest';
import { investmentAssets, type FinanceAssetProfile } from './financeAssets';
import type { FinanceStatement } from '@/components/finance/StatementsView';
import { normalizeData } from './fileStorage';

const statement = (id: string, accountId: string, date: string, holdings: [string, number][]): FinanceStatement => ({ id, accountId, date, totalValue: holdings.reduce((sum, [, value]) => sum + value, 0), holdings: holdings.map(([name, value], i) => ({ id: String(i), name, value })) });
describe('Investment asset history', () => {
  it('keeps assets absent from the latest statement and merges names across accounts without summing historical snapshots', () => {
    const assets = investmentAssets([statement('s3', 'pea', '2026-03-01', [['ETF Monde', 150]]), statement('s1', 'pea', '2026-01-01', [[' ETF   Monde ', 100], ['Ancien fonds', 80]]), statement('s2', 'cto', '2026-02-01', [['etf monde', 50]])], []);
    const etf = assets.find(asset => asset.id === 'etf monde')!;
    expect(etf.currentValue).toBe(200);
    expect(etf.history.map(point => point.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(assets.find(asset => asset.id === 'ancien fonds')).toMatchObject({ present: false, currentValue: 0 });
  });
  it('preserves manual profiles and information when no statement still contains the asset', () => {
    const profile: FinanceAssetProfile = { id: 'bitcoin', name: 'Bitcoin', identifier: 'BTC', category: 'Crypto', sector: '', firstInvestedOn: '2020-01-01', thesis: 'Long terme', notes: 'À conserver' };
    expect(investmentAssets([], [profile])).toEqual([expect.objectContaining({ profile, history: [], present: false })]);
  });
  it('loads older data with an empty registry and preserves statement history', () => {
    const statements = [statement('s1', 'pea', '2026-01-01', [['ETF', 100]])];
    const data = normalizeData({ financeStatements: statements });
    expect(data.financeAssets).toEqual([]);
    expect(data.financeStatements).toEqual(statements);
  });
});

describe('Asset details', () => {
  it('preserves legacy information in a single field and respects intentional clearing', async () => {
    const { assetDetails } = await import('./financeAssets');
    const profile: FinanceAssetProfile = { id: 'etf', name: 'ETF', identifier: 'WORLD', category: 'ETF', sector: 'Monde', firstInvestedOn: '', thesis: 'Long terme', notes: 'Frais réduits' };
    expect(assetDetails(profile)).toContain('WORLD');
    expect(assetDetails(profile)).toContain('Long terme');
    expect(assetDetails(profile)).toContain('Frais réduits');
    expect(assetDetails({ ...profile, details: 'Mes détails' })).toBe('Mes détails');
    expect(assetDetails({ ...profile, details: '' })).toBe('');
  });
});
