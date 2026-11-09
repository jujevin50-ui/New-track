import type { FinanceStatement } from '@/components/finance/StatementsView';

export interface FinanceAssetProfile {
  id: string;
  name: string;
  details?: string;
  identifier: string;
  category: string;
  sector: string;
  firstInvestedOn: string;
  thesis: string;
  notes: string;
}
export interface AssetObservation {
  statementId: string;
  accountId: string;
  date: string;
  value: number;
  quantity: number | null;
}
export const assetKey = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ');

export function investmentAssets(statements: FinanceStatement[], profiles: FinanceAssetProfile[]) {
  const assets = new Map<string, { id: string; name: string; history: AssetObservation[]; profile?: FinanceAssetProfile; currentValue: number; present: boolean }>();
  const latest = new Map<string, FinanceStatement>();
  const ordered = [...statements].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const statement of ordered) {
    latest.set(statement.accountId, statement);
    const grouped = new Map<string, AssetObservation>();
    for (const holding of Array.isArray(statement.holdings) ? statement.holdings : []) {
      const id = assetKey(holding.name);
      if (!id) continue;
      if (!assets.has(id)) assets.set(id, { id, name: holding.name.trim(), history: [], currentValue: 0, present: false });
      const existing = grouped.get(id);
      const value = Number(holding.value);
      if (!Number.isFinite(value)) continue;
      const quantity = holding.quantity == null ? null : Number(holding.quantity);
      grouped.set(id, { statementId: statement.id, accountId: statement.accountId, date: statement.date, value: (existing?.value ?? 0) + value, quantity: existing ? existing.quantity != null && quantity != null ? existing.quantity + quantity : null : quantity });
    }
    for (const [id, observation] of grouped) assets.get(id)!.history.push(observation);
  }
  for (const asset of assets.values()) {
    for (const observation of asset.history) {
      if (latest.get(observation.accountId)?.id !== observation.statementId) continue;
      asset.currentValue += observation.value;
      if (observation.value > 0 || (observation.quantity ?? 0) > 0) asset.present = true;
    }
  }
  for (const profile of profiles) {
    const asset = assets.get(profile.id);
    if (asset) asset.profile = profile;
    else assets.set(profile.id, { id: profile.id, name: profile.name, profile, history: [], currentValue: 0, present: false });
  }
  return [...assets.values()].sort((a, b) => Number(b.present) - Number(a.present) || a.name.localeCompare(b.name, 'fr'));
}

export function assetDetails(profile?: FinanceAssetProfile): string {
  if (!profile) return '';
  if (profile.details !== undefined) return profile.details;
  return [
    profile.identifier && `Ticker / ISIN : ${profile.identifier}`,
    profile.category && `Type : ${profile.category}`,
    profile.sector && `Secteur / zone : ${profile.sector}`,
    profile.firstInvestedOn && `Premier investissement : ${profile.firstInvestedOn}`,
    profile.thesis,
    profile.notes,
  ].filter(Boolean).join('\n\n');
}
