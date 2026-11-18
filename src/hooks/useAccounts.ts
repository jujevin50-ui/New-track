import { useCallback, useSyncExternalStore, useEffect } from 'react';
import { Account, AccountFormData, AccountStatus } from '@/types/account';
import { useData } from '@/contexts/DataContext';

import { readActiveAccount, subscribeActiveAccount, selectActiveAccount } from '@/lib/activeAccountStore';

export const useAccounts = () => {
  const { data, status, addRow, updateRow, deleteRow } = useData();

  const activeAccountId = useSyncExternalStore(subscribeActiveAccount, readActiveAccount, () => 'all');
  const setActiveAccountId = selectActiveAccount;
  useEffect(() => {
    if (status === 'connected' && activeAccountId !== 'all' && !(data.accounts as Account[]).some(account => account.id === activeAccountId && !account.hidden)) {
      selectActiveAccount('all');
    }
  }, [status, data.accounts, activeAccountId]);

  const allAccounts: Account[] = (data.accounts as Account[]).map(a => ({
    id: a.id,
    hidden: a.hidden,
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

  const setAccountHidden = useCallback(async (id: string, hidden: boolean) => {
    await updateRow('accounts', id, { hidden });
  }, [updateRow]);

  const deleteAccount = useCallback(async (id: string) => {
    await deleteRow('accounts', id);
    if (activeAccountId === id) {
      setActiveAccountId('all');
    }
  }, [deleteRow, activeAccountId, setActiveAccountId]);

  const accounts = allAccounts.filter(account => !account.hidden);
  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

  return {
    accounts,
    allAccounts,
    activeAccount,
    activeAccountId,
    setActiveAccountId,
    addAccount,
    updateAccount,
    setAccountHidden,
    deleteAccount,
    loading: status === 'loading',
  };
};
