CREATE TABLE public.daily_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own analyses"
  ON public.daily_analyses
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_daily_analyses_updated_at
  BEFORE UPDATE ON public.daily_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();