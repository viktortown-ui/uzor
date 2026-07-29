import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { getSupabaseClient } from '../../lib/supabase/client';

export type AuthState = 'loading' | 'unauthenticated' | 'authenticated' | 'legacy-anonymous' | 'bootstrap-error';
type OpenCityMembership = { city_slug: string; circle_id: string; role: 'participant' };
type AuthContextValue = {
  state: AuthState; user: User | null; membership: OpenCityMembership | null; error: string;
  sendCode(email: string): Promise<void>; verifyCode(email: string, token: string): Promise<void>;
  bootstrapCity(): Promise<void>; signOut(): Promise<void>; retry(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function classify(session: Session | null): AuthState {
  if (!session?.user) return 'unauthenticated';
  return session.user.is_anonymous === true ? 'legacy-anonymous' : 'authenticated';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(isDemoMode ? 'authenticated' : 'loading');
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<OpenCityMembership | null>(isDemoMode ? { city_slug: 'perm', circle_id: 'demo-circle', role: 'participant' } : null);
  const [error, setError] = useState('');

  const restore = useCallback(async () => {
    if (isDemoMode) return;
    if (!isProductionConfigured) { setState('bootstrap-error'); setError('Подключение к Supabase не настроено.'); return; }
    setState('loading'); setError('');
    try {
      const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
      if (sessionError) throw sessionError;
      setUser(data.session?.user ?? null); setState(classify(data.session));
    } catch (cause) { setState('bootstrap-error'); setError(cause instanceof Error ? cause.message : 'Не удалось восстановить сессию.'); }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(restore);
    if (isDemoMode || !isProductionConfigured) return;
    const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setState(classify(session));
      if (!session) setMembership(null);
    });
    return () => data.subscription.unsubscribe();
  }, [restore]);

  const sendCode = useCallback(async (email: string) => {
    setError('');
    const { error: otpError } = await getSupabaseClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (otpError) throw otpError;
  }, []);
  const bootstrapCity = useCallback(async () => {
    if (isDemoMode) return;
    const { data, error: rpcError } = await getSupabaseClient().rpc('ensure_open_city_membership', { input_city_slug: 'perm' });
    if (rpcError) throw rpcError;
    const row = Array.isArray(data) ? data[0] : data;
    setMembership(row as OpenCityMembership);
  }, []);
  const verifyCode = useCallback(async (email: string, token: string) => {
    setError('');
    const { data, error: otpError } = await getSupabaseClient().auth.verifyOtp({ email, token, type: 'email' });
    if (otpError || !data.session || data.user?.is_anonymous) throw otpError ?? new Error('Не удалось создать постоянную сессию.');
    setUser(data.user); setState('authenticated');
  }, []);
  const signOut = useCallback(async () => { if (!isDemoMode) await getSupabaseClient().auth.signOut(); setUser(null); setMembership(null); setState('unauthenticated'); }, []);
  const value = useMemo(() => ({ state, user, membership, error, sendCode, verifyCode, bootstrapCity, signOut, retry: restore }), [state, user, membership, error, sendCode, verifyCode, bootstrapCity, signOut, restore]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
