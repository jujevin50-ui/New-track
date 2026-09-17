ALTER TABLE public.accounts 
ADD COLUMN payout_interval_days integer DEFAULT 0,
ADD COLUMN daily_drawdown_pct numeric DEFAULT 0,
ADD COLUMN max_drawdown_pct numeric DEFAULT 0;