import type { FinanceStatement } from '@/components/finance/StatementsView';

export interface FinanceAssetProfile {
  id: string;
  name: string;
  details?: string;
  isin?: string;
  pdf?: { name: string; size: number; content: string };
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
  return [...assets.values()].map(asset => ({ ...asset, isin: assetIsin(asset.profile, asset.name) })).sort((a, b) => Number(b.present) - Number(a.present) || a.name.localeCompare(b.name, 'fr'));
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

export const normalizeIsin = (value: string) => value.replace(/\s/g, '').toUpperCase();

export function isValidIsin(value: string): boolean {
  const isin = normalizeIsin(value);
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return false;
  const digits = [...isin].map(char => /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char).join('');
  let sum = 0;
  for (let i = digits.length - 1, position = 0; i >= 0; i--, position++) {
    let digit = Number(digits[i]);
    if (position % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Recover a single unambiguous existing code; never guess an ISIN from a name. */
export function assetIsin(profile?: FinanceAssetProfile, name = ''): string {
  if (profile?.isin !== undefined) return normalizeIsin(profile.isin);
  const text = [name, profile?.identifier, profile?.details, profile?.thesis, profile?.notes].filter(Boolean).join(' ');
  const candidates = [...new Set((text.toUpperCase().match(/\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b/g) ?? []).filter(isValidIsin))];
  return candidates.length === 1 ? candidates[0] : '';
}
