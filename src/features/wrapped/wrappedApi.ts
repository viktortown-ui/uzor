import { getSupabaseClient } from '../../lib/supabase/client';
import { normalizeWrappedReport } from './wrappedLogic';
import type { WrappedReport } from './wrappedTypes';

export class WrappedApiError extends Error {
  constructor(public kind: 'no-session' | 'no-circle' | 'missing-rpc' | 'unknown', message: string, public cause?: unknown) {
    super(message);
    this.name = 'WrappedApiError';
  }
}

export async function getMyWrappedReport(themeId?: string): Promise<WrappedReport> {
  const client = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw new WrappedApiError('unknown', 'Не удалось проверить сессию Supabase.', sessionError);
  if (!sessionData.session) throw new WrappedApiError('no-session', 'Войдите в закрытый круг.');

  const { data, error } = await client.rpc('get_my_wrapped_report', { input_theme_id: themeId ?? null, input_week_start: null });
  if (error) {
    console.error('[UZOR-WRAPPED]', error);
    const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    if (message.includes('function') || message.includes('schema cache') || message.includes('get_my_wrapped_report')) throw new WrappedApiError('missing-rpc', 'Нужно применить migration 004_weekly_wrapped_rpc.sql.', error);
    if (message.includes('not allowed') || message.includes('no active circle')) throw new WrappedApiError('no-circle', 'Войдите в закрытый круг.', error);
    throw new WrappedApiError('unknown', 'Не удалось загрузить Wrapped.', error);
  }
  return normalizeWrappedReport(data as Partial<WrappedReport> | null);
}
