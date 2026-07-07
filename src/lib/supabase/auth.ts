import { getSupabaseClient } from './client';

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
