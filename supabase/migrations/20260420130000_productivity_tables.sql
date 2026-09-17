
-- Productivity: calendar events
CREATE TABLE public.prod_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  all_day BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  notify BOOLEAN NOT NULL DEFAULT false,
  notify_before INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prod_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own events" ON public.prod_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Productivity: task lists
CREATE TABLE public.prod_task_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prod_task_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task lists" ON public.prod_task_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Productivity: tasks
CREATE TABLE public.prod_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  list_id UUID NOT NULL REFERENCES public.prod_task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  due_date TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prod_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.prod_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Productivity: habits
CREATE TABLE public.prod_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎯',
  color TEXT NOT NULL DEFAULT '#818cf8',
  notify_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_time TEXT DEFAULT '08:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.prod_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habits" ON public.prod_habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Productivity: habit completions
CREATE TABLE public.prod_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL REFERENCES public.prod_habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, habit_id, date)
);
ALTER TABLE public.prod_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own completions" ON public.prod_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
