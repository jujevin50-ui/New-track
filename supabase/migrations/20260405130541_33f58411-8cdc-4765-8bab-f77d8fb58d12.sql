ALTER TABLE public.daily_analyses 
ADD COLUMN update_interval_hours integer NOT NULL DEFAULT 24,
ADD COLUMN last_updated_at timestamp with time zone NOT NULL DEFAULT now();