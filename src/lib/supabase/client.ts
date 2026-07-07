import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isProductionConfigured, supabaseConfig } from '../../app/appMode';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isProductionConfigured || !supabaseConfig.url || !supabaseConfig.key) {
    throw new Error('Supabase is not configured for production mode');
  }
  client ??= createClient(supabaseConfig.url, supabaseConfig.key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
