import { getSupabaseClient } from './client';
import type { User } from '@supabase/supabase-js';

/** Authentication preflight only; resolver authorization remains a PostgreSQL decision. */
export async function getCurrentAuthenticatedUser(): Promise<User | null> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function ensureAnonymousSession() {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error('Анонимный вход недоступен. Проверьте, что Anonymous Sign-In включён в Supabase.');
  if (!data.session) throw new Error('Не удалось создать анонимную сессию.');
  return data.session;
}

export async function hasSupabaseSession(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[UZOR-SESSION]', error);
    return false;
  }
  return Boolean(data.session);
}
