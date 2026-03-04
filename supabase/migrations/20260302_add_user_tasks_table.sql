-- Migration to add user_tasks table
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.user_tasks;
CREATE POLICY "Enable all access for users based on user_id" ON public.user_tasks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON public.user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_deadline ON public.user_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON public.user_tasks(status);
