
CREATE TABLE public.htf_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pair TEXT NOT NULL,
  content TEXT DEFAULT '',
  screenshots TEXT[] DEFAULT '{}',
  criteria JSONB DEFAULT '[]',
  update_interval_hours INTEGER NOT NULL DEFAULT 4,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.htf_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own htf analyses"
ON public.htf_analyses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_htf_analyses_updated_at
BEFORE UPDATE ON public.htf_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
