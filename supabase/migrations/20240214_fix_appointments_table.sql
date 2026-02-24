-- Migration to fix appointments table with proper RLS and policies
-- Ensure the table exists with the correct structure and user isolation

-- 1. CREATE APPOINTMENTS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('visit', 'delivery', 'meeting', 'office', 'other')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS ON APPOINTMENTS TABLE
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES FOR APPOINTMENTS TABLE
-- Using the explicit naming pattern to avoid conflicts and ensure full user isolation
DROP POLICY IF EXISTS "Users can manage their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable all access for users based on user_id" ON public.appointments;

-- SELECT/INSERT/UPDATE/DELETE Policy
CREATE POLICY "Enable all access for users based on user_id" ON public.appointments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON public.appointments(project_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
