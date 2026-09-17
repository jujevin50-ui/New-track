export interface PendingOrder {
  id: string;
  date: string;
  pair: string;
  type: 'Buy Limit' | 'Sell Limit' | 'Buy Stop' | 'Sell Stop';
  screenshot?: string;
  note: string;
  accountId: string;
  status: 'pending' | 'triggered' | 'cancelled';
  /** Shared by sibling orders created together for several accounts */
  groupId?: string;
}

export type PendingOrderFormData = Omit<PendingOrder, 'id' | 'status'>;
