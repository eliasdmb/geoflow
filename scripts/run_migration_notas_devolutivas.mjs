// @ts-check
/**
 * Executa a migração das tabelas notas_devolutivas e exigencias.
 * Uso: node scripts/run_migration_notas_devolutivas.mjs
 * Requer: SUPABASE_SERVICE_ROLE_KEY no .env.local
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  console.error('   Obtenha em: Supabase Dashboard → Project Settings → API → service_role key');
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌  Não foi possível extrair o project ref da URL:', url);
  process.exit(1);
}

const sql = readFileSync(
  resolve(__dirname, '..', 'supabase', 'migrations', '20260427_notas_devolutivas.sql'),
  'utf-8'
);

console.log('🚀  Executando migração: notas_devolutivas + exigencias...');

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
  // Tabelas já existentes não são erro crítico
  if (body.includes('already exists')) {
    console.log('ℹ️   Tabelas já existem — nenhuma alteração necessária.');
    process.exit(0);
  }
  console.error('❌  Erro na migração:', body);
  process.exit(1);
}

console.log('✅  Tabelas notas_devolutivas e exigencias criadas com sucesso!');
console.log('   Políticas RLS e índices aplicados.');
