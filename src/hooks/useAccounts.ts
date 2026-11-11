import { useCallback, useSyncExternalStore, useEffect } from 'react';
import { Account, AccountFormData, AccountStatus } from '@/types/account';
import { useData } from '@/contexts/DataContext';

import { readActiveAccount, subscribeActiveAccount, selectActiveAccount } from '@/lib/activeAccountStore';

export const useAccounts = () => {
  const { data, status, addRow, updateRow, deleteRow } = useData();

  const activeAccountId = useSyncExternalStore(subscribeActiveAccount, readActiveAccount, () => 'all');
  const setActiveAccountId = selectActiveAccount;
  useEffect(() => {
    if (status === 'connected' && activeAccountId !== 'all' && !(data.accounts as Account[]).some(account => account.id === activeAccountId)) {
      selectActiveAccount('all');
    }
  }, [status, data.accounts, activeAccountId]);

  const accounts: Account[] = (data.accounts as Account[]).map(a => ({
    id: a.id,
    accountCode: a.accountCode || '',
    name: a.name,
    broker: a.broker,
    initialBalance: Number(a.initialBalance),
    currency: a.currency,
    createdAt: a.createdAt || '',
    status: a.status as AccountStatus,
    category: a.category || '',
    payoutIntervalDays: Number(a.payoutIntervalDays) || 0,
    dailyDrawdownPct: Number(a.dailyDrawdownPct) || 0,
    maxDrawdownPct: Number(a.maxDrawdownPct) || 0,
    riskPct: a.riskPct != null && Number.isFinite(Number(a.riskPct)) ? Number(a.riskPct) : 1,
  }));

  const addAccount = useCallback(async (formData: AccountFormData) => {
    const id = crypto.randomUUID();
    const account: Account = { ...formData, id };
    await addRow('accounts', account);
    if (!activeAccountId) setActiveAccountId(id);
    return account;
  }, [addRow, activeAccountId, setActiveAccountId]);

  const updateAccount = useCallback(async (id: string, formData: AccountFormData) => {
    await updateRow('accounts', id, { ...formData, id });
  }, [updateRow]);

  const deleteAccount = useCallback(async (id: string) => {
    await deleteRow('accounts', id);
    if (activeAccountId === id) {
      setActiveAccountId('all');
    }
  }, [deleteRow, activeAccountId, setActiveAccountId]);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;
  const categories = [...new Set(accounts.map(a => a.category).filter(Boolean))];

  return {
    accounts,
    activeAccount,
    activeAccountId,
    setActiveAccountId,
    addAccount,
    updateAccount,
    deleteAccount,
    categories,
    loading: status === 'loading',
  };
};
