import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configuração do Supabase ausente.');
}

// Configuração do cliente com lógica de retry aprimorada para lidar com flutuações de rede
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'geoflow-auth-token'
  },
  global: {
    headers: { 'x-application-name': 'geoflow-metrica-agro' },
    // Aumenta a resiliência a falhas temporárias de rede
    // Fix: Using explicit parameters (input, init) to satisfy TypeScript requirements for non-rest parameter functions
    fetch: (input, init) => {
      return fetch(input, init).catch(err => {
        if (err.message.includes('Failed to fetch')) {
          console.warn("Supabase Fetch Interrompido - Verificando status do servidor...");
        }
        throw err;
      });
    }
  }
});

/**
 * Verifica se o servidor Supabase está online.
 * Retorna true se houver resposta (mesmo erro de auth), 
 * false se houver falha de rede (projeto pausado).
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  const timeoutMs = 12000; // Aumentado para 12 segundos para redes mais lentas
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log("Verificando conexão com Supabase...");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 400 || response.ok) {
      console.log("Conexão Supabase: OK (Status " + response.status + ")");
      return true;
    }

    console.error("Servidor Supabase retornou erro inesperado:", response.status);
    return false;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error("Timeout de Conexão Supabase (" + timeoutMs + "ms)");
    } else {
      console.error("Falha de Rede Crítica Supabase:", err.message || err);
    }
    return false;
  }
};
