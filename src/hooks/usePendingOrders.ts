import { useCallback } from 'react';
import { PendingOrder, PendingOrderFormData } from '@/types/pendingOrder';
import { useData } from '@/contexts/DataContext';

export const usePendingOrders = (accountId: string | null) => {
  const { data, addRow, updateRow, deleteRow } = useData();

  const allOrders: PendingOrder[] = (data.pendingOrders as any[]).map(o => ({
    id: o.id,
    date: o.date,
    pair: o.pair,
    type: o.type,
    screenshot: o.screenshot || '',
    note: o.note ?? o.analysis ?? '',
    accountId: o.accountId,
    status: o.status,
    groupId: o.groupId,
  }));

  const pendingOrders = accountId && accountId !== 'all'
    ? allOrders.filter(o => o.accountId === accountId && o.status === 'pending')
    : accountId === 'all'
      ? allOrders.filter(o => o.status === 'pending')
      : [];

  const addOrder = useCallback(async (formData: PendingOrderFormData) => {
    const order: PendingOrder = { ...formData, id: crypto.randomUUID(), status: 'pending' };
    await addRow('pendingOrders', order);
  }, [addRow]);

  const updateOrder = useCallback(async (id: string, updates: Partial<PendingOrder>) => {
    await updateRow('pendingOrders', id, updates);
  }, [updateRow]);

  const deleteOrder = useCallback(async (id: string) => {
    await deleteRow('pendingOrders', id);
  }, [deleteRow]);

  /* Triggers the order AND its siblings (same order placed on other accounts).
     Returns every triggered order so the caller can create one trade per account. */
  const triggerOrder = useCallback(async (id: string): Promise<PendingOrder[]> => {
    const order = allOrders.find(o => o.id === id);
    if (!order) return [];
    const isSibling = (o: PendingOrder) =>
      o.status === 'pending' &&
      (o.id === id ||
        (order.groupId
          ? o.groupId === order.groupId
          // legacy orders without groupId: same order created the same day for other accounts
          : o.date === order.date && o.pair === order.pair && o.type === order.type &&
            o.note === order.note && (o.screenshot || '') === (order.screenshot || '')));
    const siblings = allOrders.filter(isSibling);
    for (const o of siblings) {
      await updateRow('pendingOrders', o.id, { status: 'triggered' });
    }
    return siblings;
  }, [updateRow, allOrders]);

  const cancelOrder = useCallback(async (id: string) => {
    await updateRow('pendingOrders', id, { status: 'cancelled' });
  }, [updateRow]);

  return { pendingOrders, addOrder, updateOrder, deleteOrder, triggerOrder, cancelOrder };
};
