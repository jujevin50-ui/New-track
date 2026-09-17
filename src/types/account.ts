export type AccountStatus = 'active' | 'terminated' | 'pending' | 'paid_out';

export interface Account {
  id: string;
  accountCode: string;
  name: string;
  broker: string;
  initialBalance: number;
  currency: string;
  createdAt: string;
  status: AccountStatus;
  category: string;
  payoutIntervalDays: number;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  riskPct: number;
}

export type AccountFormData = Omit<Account, 'id'>;
