import { useCallback, useState, useEffect } from 'react';
import { Account, AccountFormData, AccountStatus } from '@/types/account';
import { useData } from '@/contexts/DataContext';

const ACTIVE_KEY = 'trading-journal-active-account';

export const useAccounts = () => {
  const { data, status, addRow, updateRow, deleteRow } = useData();

  const [activeAccountId, setActiveAccountId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_KEY)
  );

  useEffect(() => {
    if (activeAccountId) localStorage.setItem(ACTIVE_KEY, activeAccountId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeAccountId]);

  const accounts: Account[] = (data.accounts as any[]).map(a => ({
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
    riskPct: Number(a.riskPct) ?? 1,
  }));

  const addAccount = useCallback(async (formData: AccountFormData) => {
    const id = crypto.randomUUID();
    const account: Account = { ...formData, id };
    await addRow('accounts', account);
    if (!activeAccountId) setActiveAccountId(id);
    return account;
  }, [addRow, activeAccountId]);

  const updateAccount = useCallback(async (id: string, formData: AccountFormData) => {
    await updateRow('accounts', id, { ...formData, id });
  }, [updateRow]);

  const deleteAccount = useCallback(async (id: string) => {
    await deleteRow('accounts', id);
    if (activeAccountId === id) {
      const remaining = accounts.filter(a => a.id !== id);
      setActiveAccountId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [deleteRow, activeAccountId, accounts]);

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
