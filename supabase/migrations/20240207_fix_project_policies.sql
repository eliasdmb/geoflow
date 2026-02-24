-- Fix RLS policies for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.projects;

CREATE POLICY "Enable all access for users based on user_id" ON public.projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix RLS policies for project_steps
ALTER TABLE public.project_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own project_steps" ON public.project_steps;
DROP POLICY IF EXISTS "Admins can delete project_steps" ON public.project_steps;
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.project_steps;

CREATE POLICY "Enable all access for users based on user_id" ON public.project_steps
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
