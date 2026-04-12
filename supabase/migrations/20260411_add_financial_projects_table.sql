-- Migration: add financial_projects table and financial_project_id to financial_transactions

-- 1. CREATE FINANCIAL_PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.financial_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#22c55e',
  budget NUMERIC(12, 2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS
ALTER TABLE public.financial_projects ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
DROP POLICY IF EXISTS "Users can manage their own financial projects" ON public.financial_projects;

CREATE POLICY "Users can manage their own financial projects" ON public.financial_projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. INDEX
CREATE INDEX IF NOT EXISTS idx_financial_projects_user_id ON public.financial_projects(user_id);

-- 5. ADD financial_project_id TO financial_transactions (if not already present)
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS financial_project_id UUID REFERENCES public.financial_projects(id) ON DELETE SET NULL;

-- 6. ADD financial_project_id TO credit_card_expenses (if not already present)
ALTER TABLE public.credit_card_expenses
  ADD COLUMN IF NOT EXISTS financial_project_id UUID REFERENCES public.financial_projects(id) ON DELETE SET NULL;

-- 7. INDEXES on foreign keys
CREATE INDEX IF NOT EXISTS idx_financial_transactions_fp_id ON public.financial_transactions(financial_project_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_expenses_fp_id ON public.credit_card_expenses(financial_project_id);
