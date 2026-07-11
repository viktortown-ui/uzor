import { createEmptyDeltaDraft, validateDeltaStep } from './deltaCreateLogic';
import { isWithinPermMvpArea } from './deltaGeoLogic';
import type { DeltaCreateDraft } from './deltaCreateTypes';
import type { CreateDeltaInput, DeltaCard, DeltaCategory, DeltaEffect, ReactToDeltaResult } from '../deltas/deltaTypes';
import { getDeltaEffectCopy } from '../deltas/deltaLogic';

export type DeltaCreateResultMode = 'created_new' | 'confirmed_existing';
export const DELTA_CREATE_PRODUCTION_STORAGE_KEY = 'uzor_delta_create_v1';

export function buildCreateDeltaInput(draft: DeltaCreateDraft, circleId: string): CreateDeltaInput {
  if (!draft.categorySlug || !draft.direction || !draft.changeType || !draft.observedWindow || !draft.impactLevel || draft.lat == null || draft.lng == null || !isWithinPermMvpArea(draft.lat, draft.lng)) throw new Error('invalid_delta_payload');
  return { circleId, citySlug: 'perm', categorySlug: draft.categorySlug, direction: draft.direction, subject: draft.subject.trim(), changeType: draft.changeType, statement: draft.statement.trim(), details: draft.details.trim() || null, observedWindow: draft.observedWindow, impactLevel: draft.impactLevel, lat: draft.lat, lng: draft.lng, locationLabel: draft.locationLabel.trim(), locationPrecision: draft.locationPrecision };
}

export function canPublishSeparate(draft: DeltaCreateDraft) { const coreErrors = [2,3].flatMap((step) => validateDeltaStep(draft, step as DeltaCreateDraft['currentStep'])); return coreErrors.length === 0 && typeof draft.lat === 'number' && typeof draft.lng === 'number' && !!draft.locationLabel.trim() && isWithinPermMvpArea(draft.lat, draft.lng); }
export function canConfirmExisting(draft: DeltaCreateDraft) { return !!draft.selectedSimilarDeltaId && draft.similarDecision === 'existing'; }

export function canNavigateToStep(targetStep: number, draft: DeltaCreateDraft) {
  if (targetStep <= draft.currentStep) return targetStep >= 1 && targetStep <= 4;
  for (let step = 1; step < targetStep; step += 1) {
    const errors = step === 1
      ? (!draft.locationLabel.trim() || typeof draft.lat !== 'number' || typeof draft.lng !== 'number' || !isWithinPermMvpArea(draft.lat, draft.lng) ? ['location'] : [])
      : validateDeltaStep(draft, step as DeltaCreateDraft['currentStep']).filter(Boolean);
    if (errors.length) return false;
  }
  return targetStep >= 1 && targetStep <= 4;
}

export async function shareDeltaPayload(payload: { title: string; text: string; url: string }, nav: Navigator = navigator) {
  if ('share' in nav && typeof nav.share === 'function') {
    try { await nav.share(payload); return 'Дельта отправлена'; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'Отправка отменена'; }
  }
  const text = `${payload.text} ${payload.url}`;
  try { if (nav.clipboard?.writeText) { await nav.clipboard.writeText(text); return 'Ссылка на Дельту скопирована'; } } catch { /* fallback */ }
  try {
    const t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove();
    return ok ? 'Ссылка на Дельту скопирована' : 'Не удалось поделиться ссылкой';
  } catch { return 'Не удалось поделиться ссылкой'; }
}

export function buildDeltaSharePayload(delta: Pick<DeltaCard, 'id' | 'statement'>, mode: DeltaCreateResultMode, baseHref = typeof window !== 'undefined' ? window.location.href : 'https://example.test/#/') {
  const base = new URL(baseHref);
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname.replace(/\/[^/]*$/, '')}/`;
  const url = `${base.origin}${basePath}#/map?delta=${encodeURIComponent(delta.id)}`;
  const text = mode === 'created_new' ? `Я заметил Дельту в Перми: ${delta.statement}. Помогите проверить изменение.` : `Я помог подтвердить Дельту в Перми: ${delta.statement}. Посмотрите, что меняется рядом.`;
  return { title: 'Дельта в УЗОР', text, url };
}

export function mapDeltaPublishError(error: unknown) {
  const message = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : error instanceof Error ? error.message : String(error ?? '');
  if (/not_authenticated/.test(message)) return 'Нужно войти в круг, чтобы добавить Дельту.';
  if (/not_circle_member/.test(message)) return 'Вы ещё не подключены к кругу.';
  if (/city_not_found/.test(message)) return 'Пермь пока не подключена к системе Дельт.';
  if (/category_not_found/.test(message)) return 'Эта категория больше недоступна. Выберите другую.';
  if (/invalid_coordinates/.test(message)) return 'Не удалось определить место. Выберите точку ещё раз.';
  if (/invalid_delta_payload/.test(message)) return 'Проверьте заполненные данные.';
  if (/delta_not_found/.test(message)) return 'Похожая Дельта больше недоступна.';
  if (/author_reaction_locked/.test(message)) return 'Первая отметка автора уже закреплена.';
  if (/function|schema cache|migration|rpc/i.test(message)) return 'Сервис Дельт временно недоступен. Попробуйте позже.';
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

const demoCategory: DeltaCategory = { slug: 'transport', title: 'Транспорт и дорога', iconKey: 'transport' };
export function createDemoDeltaResult(draft: DeltaCreateDraft): { delta: DeltaCard; effect: ReturnType<typeof getDeltaEffectCopy> } {
  const now = new Date().toISOString(); const target = 3;
  const delta: DeltaCard = { id: `demo-delta-${Math.random().toString(36).slice(2)}`, category: { ...demoCategory, slug: draft.categorySlug || 'transport' }, direction: draft.direction || 'positive', subject: draft.subject.trim() || 'демо-изменение', changeType: draft.changeType || 'improved', statement: draft.statement.trim() || 'Демо-изменение стало заметнее', details: draft.details.trim() || null, observedWindow: draft.observedWindow || 'today', impactLevel: draft.impactLevel || 'noticeable', status: 'new', moderationState: 'visible', confirmCount: 1, disconfirmCount: 0, confirmationTarget: target, viewerReaction: 'confirm', location: { lat: draft.lat ?? 58.0105, lng: draft.lng ?? 56.2502, label: draft.locationLabel || 'Пермь', precision: draft.locationPrecision }, priorityScore: .5, createdAt: now, lastActivityAt: now, expiresAt: now };
  return { delta, effect: getDeltaEffectCopy('created', null, 'new') };
}
export function createDemoReactionResult(delta: DeltaCard): ReactToDeltaResult { const confirmCount = delta.confirmCount + 1; const status = confirmCount >= delta.confirmationTarget ? 'confirmed' : 'checking'; return { delta: { id: delta.id, status, confirmationTarget: delta.confirmationTarget, confirmCount, disconfirmCount: delta.disconfirmCount, progress: { current: confirmCount, target: delta.confirmationTarget } }, effect: getDeltaEffectCopy('confirm', delta.status, status) }; }
export function getProductionResultCopy(mode: DeltaCreateResultMode, result: { effect: Pick<DeltaEffect, 'message' | 'detail'> }) { return mode === 'created_new' ? { title: 'Дельта опубликована', lead: result.effect.message, detail: result.effect.detail } : { title: 'Вы подтвердили Дельту', lead: result.effect.message, detail: result.effect.detail }; }
export function resetProductionDraftAfterSuccess() { return createEmptyDeltaDraft(); }
