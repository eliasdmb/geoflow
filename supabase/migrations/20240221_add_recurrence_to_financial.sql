-- Adicionar colunas para recorrência e parcelamento
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS occurrence_number INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS total_occurrences INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Garantir colunas essenciais
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS account TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'Empresa';
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
