import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { getSupabaseClient } from '../../lib/supabase/client';

export type AuthenticationState = 'loading' | 'unauthenticated' | 'legacy-anonymous' | 'authenticated' | 'error';
export type AccessState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
export type OpenCityMembership = { city_slug: string; circle_id: string; role: 'participant' | 'curator' };
type AuthContextValue = {
  authenticationState: AuthenticationState; accessState: AccessState; user: User | null;
  membership: OpenCityMembership | null; authenticationError: string; accessError: string;
  sendCode(email: string): Promise<void>; verifyCode(email: string, token: string): Promise<void>;
  bootstrapCity(): Promise<void>; signOut(): Promise<void>; retryAuthentication(): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

function classify(session: Session | null): AuthenticationState {
  if (!session?.user) return 'unauthenticated';
  return session.user.is_anonymous === true ? 'legacy-anonymous' : 'authenticated';
}
export function readableAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (/invalid|expired|token/i.test(message)) return 'Код неверный или уже истёк. Запросите новый код.';
  if (/rate|limit|too many/i.test(message)) return 'Слишком много попыток. Подождите немного и повторите.';
  if (/network|fetch/i.test(message)) return 'Не удалось связаться с сервером. Проверьте интернет и повторите.';
  return fallback;
}
function validMembership(value: unknown): value is OpenCityMembership {
  return !!value && typeof value === 'object' && 'city_slug' in value && value.city_slug === 'perm' && 'circle_id' in value && typeof value.circle_id === 'string' && 'role' in value && (value.role === 'participant' || value.role === 'curator');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticationState, setAuthenticationState] = useState<AuthenticationState>(isDemoMode ? 'authenticated' : 'loading');
  const [accessState, setAccessState] = useState<AccessState>(isDemoMode ? 'ready' : 'idle');
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<OpenCityMembership | null>(isDemoMode ? { city_slug: 'perm', circle_id: 'demo-circle', role: 'participant' } : null);
  const [authenticationError, setAuthenticationError] = useState(''); const [accessError, setAccessError] = useState('');
  const bootstrapSequence = useRef(0);

  const bootstrapCity = useCallback(async () => {
    if (isDemoMode) return;
    const sequence = ++bootstrapSequence.current; setAccessState('loading'); setAccessError('');
    const { data, error } = await getSupabaseClient().rpc('ensure_open_city_membership', { input_city_slug: 'perm' });
    if (sequence !== bootstrapSequence.current) return;
    if (error) {
      const unavailable = /unavailable|disabled|not found/i.test(error.message ?? '');
      setAccessState(unavailable ? 'unavailable' : 'error'); setAccessError(unavailable ? 'Открытое пространство Перми пока не подключено.' : 'Не удалось подключить пространство Перми. Повторите попытку.');
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!validMembership(row)) { setAccessState('error'); setAccessError('Сервер вернул некорректный контекст доступа.'); return; }
    setMembership(row); setAccessState('ready');
  }, []);

  const applySession = useCallback(async (session: Session | null) => {
    const next = classify(session); setUser(session?.user ?? null); setAuthenticationState(next); setAuthenticationError('');
    if (next === 'authenticated') await bootstrapCity();
    else { ++bootstrapSequence.current; setMembership(null); setAccessState('idle'); setAccessError(''); }
  }, [bootstrapCity]);
  const restore = useCallback(async () => {
    if (isDemoMode) return;
    if (!isProductionConfigured) { setAuthenticationState('error'); setAuthenticationError('Подключение к Supabase не настроено.'); return; }
    setAuthenticationState('loading'); setAuthenticationError('');
    try { const { data, error } = await getSupabaseClient().auth.getSession(); if (error) throw error; await applySession(data.session); }
    catch (error) { setAuthenticationState('error'); setAuthenticationError(readableAuthError(error, 'Не удалось восстановить сессию.')); }
  }, [applySession]);
  useEffect(() => {
    void Promise.resolve().then(restore);
    if (isDemoMode || !isProductionConfigured) return;
    const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => { void applySession(session); });
    return () => data.subscription.unsubscribe();
  }, [applySession, restore]);

  const sendCode = useCallback(async (email: string) => { const { error } = await getSupabaseClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); if (error) throw new Error(readableAuthError(error, 'Не удалось отправить код.')); }, []);
  const verifyCode = useCallback(async (email: string, token: string) => {
    const { data, error } = await getSupabaseClient().auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.session || data.user?.is_anonymous) throw new Error(readableAuthError(error, 'Не удалось подтвердить код.'));
    await applySession(data.session);
  }, [applySession]);
  const signOut = useCallback(async () => { if (!isDemoMode) { const { error } = await getSupabaseClient().auth.signOut(); if (error) throw error; } await applySession(null); }, [applySession]);
  const value = useMemo(() => ({ authenticationState, accessState, user, membership, authenticationError, accessError, sendCode, verifyCode, bootstrapCity, signOut, retryAuthentication: restore }), [authenticationState, accessState, user, membership, authenticationError, accessError, sendCode, verifyCode, bootstrapCity, signOut, restore]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
