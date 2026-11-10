import type { Account } from '@/types/account';
import { buildDashboardCurrencyGroups } from './dashboardAnalytics';

export function accountScope(accounts: Account[], selectedId: string | null | undefined, preferredCurrency = '') {
  const selected = selectedId === 'all' ? accounts : accounts.filter(account => account.id === selectedId);
  const groups = buildDashboardCurrencyGroups(selected);
  const group = groups.find(group => group.currency === preferredCurrency.trim().toUpperCase()) ?? groups[0];
  const ambiguous = group?.currency === 'UNKNOWN' && group.accounts.length > 1;
  return {groups, accounts:ambiguous ? [] : group?.accounts ?? [], currency:group?.currency === 'UNKNOWN' ? '' : group?.currency ?? '', capital:ambiguous ? 0 : group?.startingCapital ?? 0};
}
