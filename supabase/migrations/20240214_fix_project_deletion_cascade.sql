-- Adicionar CASCADE DELETE para project_steps
ALTER TABLE public.project_steps 
DROP CONSTRAINT IF EXISTS project_steps_project_id_fkey,
ADD CONSTRAINT project_steps_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Adicionar CASCADE DELETE para financial_transactions
ALTER TABLE public.financial_transactions 
DROP CONSTRAINT IF EXISTS financial_transactions_project_id_fkey,
ADD CONSTRAINT financial_transactions_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Adicionar CASCADE DELETE para appointments
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_project_id_fkey,
ADD CONSTRAINT appointments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Adicionar CASCADE DELETE para credit_card_expenses
ALTER TABLE public.credit_card_expenses 
DROP CONSTRAINT IF EXISTS credit_card_expenses_project_id_fkey,
ADD CONSTRAINT credit_card_expenses_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Adicionar CASCADE DELETE para sigef_certifications
ALTER TABLE public.sigef_certifications 
DROP CONSTRAINT IF EXISTS sigef_certifications_project_id_fkey,
ADD CONSTRAINT sigef_certifications_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
