-- Add birth_date column to clients table for birthday reminders
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;
