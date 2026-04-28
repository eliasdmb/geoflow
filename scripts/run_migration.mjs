// @ts-check
/**
 * Executa migrações pendentes via Supabase Management API.
 * Uso: node scripts/run_migration.mjs
 * Requer: SUPABASE_SERVICE_ROLE_KEY no .env.local
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lê variáveis de ambiente do .env.local ou .env
function loadEnv() {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    try {
      const content = readFileSync(resolve(__dirname, '..', file), 'utf-8');
      for (const line of content.split('\n')) {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
      }
    } catch {}
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌  Defina SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local');
  console.error('   Obtenha em: https://supabase.com/dashboard/project/_/settings/api');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sql = `ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;`;

console.log('🚀  Executando migração: add birth_date to clients...');

const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ error: { message: 'RPC not available' } }));

if (error) {
  // Fallback: tenta via REST direto (requer extensão pg_net ou similar)
  // Usa o endpoint de query do Supabase (disponível via Management API)
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error('❌  Não foi possível extrair o project ref da URL:', url);
    process.exit(1);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ query: sql })
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('❌  Erro na migração:', body);
    process.exit(1);
  }

  console.log('✅  Coluna birth_date adicionada com sucesso à tabela clients!');
} else {
  console.log('✅  Migração executada com sucesso!');
}
