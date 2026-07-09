import { getSupabaseClient } from './client';
import type { ActiveTheme, CandidateProposal, CatalogItem, ContributionPayload, JoinResult, ThemeSnapshot } from './types';
import type { CatalogKind, Layer } from '../../types/domain';

export type UZorErrorCode = 'UZOR-LOAD-THEME' | 'UZOR-LOAD-CATALOG' | 'UZOR-LOAD-SNAPSHOT' | 'UZOR-JOIN' | 'UZOR-SAVE';

export class UZorApiError extends Error {
  constructor(public code: UZorErrorCode, message: string, public cause?: unknown) {
    super(`${code}: ${message}`);
    this.name = 'UZorApiError';
  }
}

function first<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

function logTechnical(code: UZorErrorCode, error: unknown) {
  console.error(`[${code}]`, error);
}

function normalizeSupabaseError(code: UZorErrorCode, fallback: string, error: unknown): never {
  logTechnical(code, error);
  throw new UZorApiError(code, fallback, error);
}

export async function joinCircleByCode(code: string): Promise<JoinResult> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await getSupabaseClient().rpc('join_circle_by_code', { input_code: normalized });
  if (error) normalizeSupabaseError('UZOR-JOIN', 'Круг не найден. Проверь ссылку или код.', error);
  const row = first(data as JoinResult | JoinResult[] | null);
  if (!row) throw new UZorApiError('UZOR-JOIN', 'Круг не найден. Проверь ссылку или код.');
  localStorage.setItem('activeCircleId', row.circle_id);
  localStorage.setItem('activeThemeId', row.theme_id);
  return row;
}

export async function loadActiveTheme(): Promise<ActiveTheme | null> {
  const { data, error } = await getSupabaseClient().rpc('get_my_active_theme');
  if (error) normalizeSupabaseError('UZOR-LOAD-THEME', 'Не удалось загрузить тему круга. Попробуйте ещё раз.', error);
  const row = first(data as { id: string; circle_id: string; title: string; subtitle: string } | Array<{ id: string; circle_id: string; title: string; subtitle: string }> | null);
  if (!row) return null;
  localStorage.setItem('activeCircleId', row.circle_id);
  localStorage.setItem('activeThemeId', row.id);
  return { id: row.id, circleId: row.circle_id, title: row.title, subtitle: row.subtitle };
}

export async function loadCatalog(themeId: string): Promise<CatalogItem[]> {
  const { data, error } = await getSupabaseClient().rpc('get_theme_catalog', { input_theme_id: themeId });
  if (error) normalizeSupabaseError('UZOR-LOAD-CATALOG', 'Не удалось загрузить карточки темы. Попробуйте ещё раз.', error);
  return (data ?? []).map((i: { id: string; kind: CatalogKind; layer: Layer | null; label: string; sort_order: number }) => ({ id: i.id, kind: i.kind, layer: i.layer, label: i.label, sortOrder: i.sort_order })) as CatalogItem[];
}

export async function getThemeSnapshot(themeId: string): Promise<ThemeSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('get_theme_snapshot', { input_theme_id: themeId });
  if (error) normalizeSupabaseError('UZOR-LOAD-SNAPSHOT', 'Не удалось загрузить нити круга. Попробуйте ещё раз.', error);
  return data as ThemeSnapshot;
}

export async function upsertContributionRpc(payload: ContributionPayload): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('upsert_contribution', { input_theme_id: payload.themeId, input_layer: payload.layer, input_signal_id: payload.signalId, input_group_id: payload.groupId, input_consequence_id: payload.consequenceId, input_evidence: payload.evidence, input_intensity: payload.intensity });
  if (error) normalizeSupabaseError('UZOR-SAVE', 'Не удалось сохранить нить. Попробуйте ещё раз.', error);
  return data as string;
}

export async function submitCandidateProposal(themeId: string, layer: Layer, kind: CatalogKind, rawText: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('submit_candidate_proposal', { input_theme_id: themeId, input_layer: layer, input_kind: kind, raw_text: rawText.trim().slice(0, 80) });
  if (error) throw error;
}

export async function listPendingCandidates(): Promise<CandidateProposal[]> {
  const { data, error } = await getSupabaseClient().from('candidate_proposals').select('id,theme_id,layer,proposal_kind,raw_text,status,created_at').eq('status', 'pending').order('created_at');
  if (error) throw error;
  return (data ?? []) as CandidateProposal[];
}

export async function isCurrentUserCurator(circleId: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) return false;
  const { data, error } = await client.from('circle_memberships').select('role').eq('circle_id', circleId).eq('user_id', sessionData.session.user.id).maybeSingle();
  if (error) return false;
  return (data as { role?: string } | null)?.role === 'curator';
}

export async function reviewCandidateProposal(inputProposalId: string, decision: 'approved' | 'rejected', approvedLabel: string, approvedKind: CatalogKind, approvedLayer: Layer): Promise<void> {
  const { error } = await getSupabaseClient().rpc('review_candidate_proposal', { input_proposal_id: inputProposalId, decision, approved_label: approvedLabel, approved_kind: approvedKind, approved_layer: approvedLayer });
  if (error) throw error;
}
