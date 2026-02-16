-- Migration to add accounts table with proper RLS and policies
-- This table was missing from the original security baseline

-- 1. CREATE ACCOUNTS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Conta Corrente', 'Conta Poupança', 'Investimento', 'Dinheiro Físico', 'Outro')),
  initial_balance NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS ON ACCOUNTS TABLE
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES FOR ACCOUNTS TABLE
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can delete accounts" ON public.accounts;

-- SELECT/INSERT/UPDATE Policy
CREATE POLICY "Users can manage their own accounts" ON public.accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Restricted DELETE Policy (admins only)
CREATE POLICY "Admins can delete accounts" ON public.accounts
FOR DELETE
USING (public.is_admin());

-- 4. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
