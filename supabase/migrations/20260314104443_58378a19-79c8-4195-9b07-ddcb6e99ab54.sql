-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== ACCOUNTS ==========
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT NOT NULL DEFAULT '',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== TRADES ==========
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  trade_number INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  pair TEXT NOT NULL,
  type TEXT NOT NULL,
  result NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  swap NUMERIC NOT NULL DEFAULT 0,
  exit_type TEXT NOT NULL DEFAULT 'TP',
  setup_quality INTEGER NOT NULL DEFAULT 1,
  strategy_respected BOOLEAN NOT NULL DEFAULT true,
  screenshots TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trades" ON public.trades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_trades_account ON public.trades(account_id);
CREATE INDEX idx_trades_user ON public.trades(user_id);

-- ========== DAILY JOURNALS ==========
CREATE TABLE public.daily_journals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  strategy_respected BOOLEAN NOT NULL DEFAULT true,
  mood TEXT NOT NULL DEFAULT 'neutral',
  discipline INTEGER NOT NULL DEFAULT 3,
  confidence INTEGER NOT NULL DEFAULT 3,
  notes TEXT DEFAULT '',
  lessons_learned TEXT DEFAULT '',
  mistakes TEXT[] DEFAULT '{}',
  goals TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journals" ON public.daily_journals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== WEEKLY REPORTS ==========
CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  emotion_generale TEXT DEFAULT '',
  trades_emotionnels INTEGER DEFAULT 0,
  trade_notes JSONB DEFAULT '{}',
  conclusion TEXT DEFAULT '',
  objectif_principal TEXT DEFAULT '',
  objectifs_secondaires TEXT DEFAULT '',
  points_psychologiques TEXT DEFAULT '',
  solutions TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_key)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reports" ON public.weekly_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_weekly_reports_updated_at BEFORE UPDATE ON public.weekly_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== PENDING ORDERS ==========
CREATE TABLE public.pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  pair TEXT NOT NULL,
  type TEXT NOT NULL,
  screenshot TEXT DEFAULT '',
  analysis TEXT DEFAULT '',
  checklist JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own orders" ON public.pending_orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== STRATEGY RULES ==========
CREATE TABLE public.strategy_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'entry',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rules" ON public.strategy_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== STRATEGY DOCS ==========
CREATE TABLE public.strategy_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nouveau document',
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own docs" ON public.strategy_docs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_strategy_docs_updated_at BEFORE UPDATE ON public.strategy_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();