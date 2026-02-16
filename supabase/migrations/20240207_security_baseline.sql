-- 1. PROFILE TABLE WITH ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'tecnico')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by users who own them" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles are updatable by users who own them" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable only by admins" 
ON public.audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. ENABLE RLS ON ALL DATA TABLES
DO $$ 
DECLARE 
  t TEXT;
  tables TEXT[] := ARRAY[
    'projects', 'project_steps', 'clients', 'properties', 'professionals', 
    'registries', 'services', 'budget_templates', 'financial_transactions', 
    'appointments', 'credit_cards', 'credit_card_expenses', 'sigef_certifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- 4. HELPER FUNCTION FOR ADMIN CHECK
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. APPLY POLICIES TO ALL TABLES
DO $$ 
DECLARE 
  t TEXT;
  tables TEXT[] := ARRAY[
    'projects', 'project_steps', 'clients', 'properties', 'professionals', 
    'registries', 'services', 'budget_templates', 'financial_transactions', 
    'appointments', 'credit_cards', 'credit_card_expenses', 'sigef_certifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Users can manage their own %I" ON public.%I', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Admins can delete %I" ON public.%I', t, t);
      
      -- SELECT/INSERT/UPDATE Policy
      EXECUTE format('
        CREATE POLICY "Users can manage their own %I" ON public.%I
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)
      ', t, t);

      -- Restricted DELETE Policy (override for admins)
      EXECUTE format('
        CREATE POLICY "Admins can delete %I" ON public.%I
        FOR DELETE
        USING (public.is_admin())
      ', t, t);
    END IF;
  END LOOP;
END $$;

-- 6. SPECIAL CASE FOR PROFILES (already done above but ensuring consistency)
DROP POLICY IF EXISTS "Profiles are viewable by users who own them" ON public.profiles;
CREATE POLICY "Profiles are viewable by users who own them" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());
