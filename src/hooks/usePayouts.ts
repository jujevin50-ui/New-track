import { useCallback, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';

export interface Payout {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  note: string;
}

export const usePayouts = (accountId: string | null) => {
  const { data, addRow, deleteRow } = useData();

  const payouts: Payout[] = useMemo(() => {
    const raw = data.payouts as any[];
    const list = accountId === 'all' ? raw : accountId ? raw.filter((p: any) => p.accountId === accountId) : [];
    return list.map((p: any) => ({
      id: p.id,
      accountId: p.accountId,
      amount: Number(p.amount),
      date: p.date,
      note: p.note || '',
    }));
  }, [data.payouts, accountId]);

  const totalPayouts = useMemo(() => payouts.reduce((s, p) => s + p.amount, 0), [payouts]);

  const addPayout = useCallback(async (amount: number, date: string, note: string, overrideAccountId?: string) => {
    const target = overrideAccountId || accountId;
    if (!target) return;
    await addRow('payouts', { id: crypto.randomUUID(), accountId: target, amount, date, note });
  }, [addRow, accountId]);

  const deletePayout = useCallback(async (id: string) => {
    await deleteRow('payouts', id);
  }, [deleteRow]);

  return { payouts, totalPayouts, addPayout, deletePayout };
};
