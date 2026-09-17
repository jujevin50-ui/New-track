
CREATE TABLE public.strategy_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images" ON public.strategy_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own images" ON public.strategy_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own images" ON public.strategy_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own images" ON public.strategy_images FOR DELETE USING (auth.uid() = user_id);
