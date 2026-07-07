import { getSupabaseClient } from './client';
import type { ActiveTheme, CandidateProposal, CatalogItem, ContributionPayload, JoinResult, ThemeSnapshot } from './types';
import type { CatalogKind, Layer } from '../../types/domain';

function first<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

export async function joinCircleByCode(code: string): Promise<JoinResult> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await getSupabaseClient().rpc('join_circle_by_code', { input_code: normalized });
  if (error) throw new Error('Круг не найден. Проверь ссылку или код.');
  const row = first(data as JoinResult | JoinResult[] | null);
  if (!row) throw new Error('Круг не найден. Проверь ссылку или код.');
  localStorage.setItem('activeCircleId', row.circle_id);
  localStorage.setItem('activeThemeId', row.theme_id);
  return row;
}

export async function loadActiveTheme(): Promise<ActiveTheme | null> {
  const themeId = localStorage.getItem('activeThemeId');
  if (!themeId) return null;
  const { data, error } = await getSupabaseClient().from('themes').select('id,circle_id,title,subtitle').eq('id', themeId).single();
  if (error) throw error;
  return { id: data.id, circleId: data.circle_id, title: data.title, subtitle: data.subtitle };
}

export async function loadCatalog(themeId: string): Promise<CatalogItem[]> {
  const { data, error } = await getSupabaseClient().from('catalog_items').select('id,kind,layer,label,sort_order').eq('theme_id', themeId).eq('is_active', true).order('sort_order');
  if (error) throw error;
  return (data ?? []).map((i) => ({ id: i.id, kind: i.kind, layer: i.layer, label: i.label, sortOrder: i.sort_order })) as CatalogItem[];
}

export async function getThemeSnapshot(themeId: string): Promise<ThemeSnapshot> {
  const { data, error } = await getSupabaseClient().rpc('get_theme_snapshot', { input_theme_id: themeId });
  if (error) throw error;
  return data as ThemeSnapshot;
}

export async function upsertContributionRpc(payload: ContributionPayload): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('upsert_contribution', { input_theme_id: payload.themeId, input_layer: payload.layer, input_signal_id: payload.signalId, input_group_id: payload.groupId, input_consequence_id: payload.consequenceId, input_evidence: payload.evidence, input_intensity: payload.intensity });
  if (error) throw error;
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

export async function reviewCandidateProposal(inputProposalId: string, decision: 'approved' | 'rejected', approvedLabel: string, approvedKind: CatalogKind, approvedLayer: Layer): Promise<void> {
  const { error } = await getSupabaseClient().rpc('review_candidate_proposal', { input_proposal_id: inputProposalId, decision, approved_label: approvedLabel, approved_kind: approvedKind, approved_layer: approvedLayer });
  if (error) throw error;
}
