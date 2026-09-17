
CREATE TABLE public.backtest_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_key text NOT NULL,
  date text NOT NULL,
  pair text NOT NULL,
  type text NOT NULL,
  result numeric NOT NULL DEFAULT 0,
  screenshot text NULL DEFAULT '',
  notes text NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.backtest_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own backtest trades"
ON public.backtest_trades
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
