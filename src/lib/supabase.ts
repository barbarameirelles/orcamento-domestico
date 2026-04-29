import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseEnabled = !!(url && key);

if (isSupabaseEnabled) {
  console.log('[Supabase] ✅ Conectado a', url);
} else {
  console.warn('[Supabase] ⚠️ Variáveis de ambiente não encontradas — usando localStorage.');
  console.warn('[Supabase] VITE_SUPABASE_URL =', url ?? '(vazio)');
  console.warn('[Supabase] VITE_SUPABASE_ANON_KEY =', key ? '(presente)' : '(vazio)');
}

export const supabase = isSupabaseEnabled ? createClient(url!, key!) : null;
