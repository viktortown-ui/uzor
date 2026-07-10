import { hasSupabaseSession } from '../../lib/supabase/auth';
import { loadActiveTheme } from '../../lib/supabase/api';
import type { DeltaCard, DeltaCategory, DeltaDirection, DeltaImpactLevel, DeltaMapItem, DeltaObservedWindow, DeltaStatus, DeltaViewportInput } from '../deltas/deltaTypes';

export const PERM_FALLBACK = { lat: 58.0105, lng: 56.2502, zoom: 11.5 };
export type DeltaMapFilters = { direction: DeltaDirection | 'all'; status: Exclude<DeltaStatus, 'archived'> | 'all'; categorySlug: string | 'all' };
export const defaultDeltaMapFilters: DeltaMapFilters = { direction: 'all', status: 'all', categorySlug: 'all' };

export async function loadDeltaMapContext(): Promise<{ circleId: string; citySlug: 'perm' } | null> {
  // Дельты не принадлежат theme. Active theme временно используется только для получения текущего circleId;
  // позже это можно заменить отдельным active-circle RPC, но на этапе карты новое RPC не создаём.
  if (!(await hasSupabaseSession())) return null;
  const activeTheme = await loadActiveTheme();
  return activeTheme?.circleId ? { circleId: activeTheme.circleId, citySlug: 'perm' } : null;
}

export function isArchivedDelta(delta: Pick<DeltaMapItem, 'status'>) { return delta.status === 'archived'; }
export function shouldShowDeltaOnMap(delta: Pick<DeltaMapItem, 'status'>) { return !isArchivedDelta(delta); }

export function getDeltaMarkerVisual(delta: DeltaMapItem, now = new Date()) {
  const total = delta.confirmCount + delta.disconfirmCount;
  const size = total <= 1 ? 20 : total === 2 ? 24 : total === 3 ? 28 : total <= 5 ? 31 : 36;
  const statusMap: Record<DeltaStatus, { ringTone: string; statusLabel: string }> = {
    new: { ringTone: 'new', statusLabel: 'Новая' }, checking: { ringTone: 'checking', statusLabel: 'Проверяется' }, confirmed: { ringTone: 'confirmed', statusLabel: 'Подтверждена' }, fork: { ringTone: 'fork', statusLabel: 'Развилка' }, archived: { ringTone: 'archived', statusLabel: 'Архив' },
  };
  const ageMs = now.getTime() - new Date(delta.lastActivityAt).getTime();
  return { coreTone: delta.direction === 'positive' ? 'positive' : 'negative', ringTone: statusMap[delta.status].ringTone, size, pulse: ageMs >= 0 && ageMs <= 24 * 60 * 60 * 1000, label: delta.direction === 'positive' ? 'Стало лучше' : 'Стало хуже', statusLabel: statusMap[delta.status].statusLabel, categoryIcon: categoryIcon(delta.category.slug) };
}

export function categoryIcon(slug: string) { if (slug === 'transport') return 'transport'; if (slug === 'services') return 'services'; return 'urban-environment'; }
export function getDirectionCopy(direction: DeltaDirection) { return direction === 'positive' ? 'Стало лучше' : 'Стало хуже'; }
export function getStatusCopy(status: DeltaStatus) { return ({ new: ['Новая дельта', 'Пока её отметил один наблюдатель.'], checking: ['Дельта проверяется', 'Ещё один человек заметил похожее изменение.'], confirmed: ['Дельта подтвердилась', 'Изменение независимо заметили несколько участников.'], fork: ['Возникла развилка', 'В этом месте люди видят ситуацию по-разному.'], archived: ['Архивная дельта', 'Она больше не показывается на карте.'] } as const)[status]; }
export function getObservedWindowCopy(value: DeltaObservedWindow) { return ({ today: 'Сегодня', last_3_days: 'Последние 3 дня', last_week: 'Последняя неделя', last_2_4_weeks: 'Последние 2–4 недели' } as const)[value]; }
export function getImpactCopy(level: DeltaImpactLevel, direction: DeltaDirection) { if (level === 'noticeable') return 'Заметно'; if (level === 'strong') return direction === 'positive' ? 'Сильно улучшило' : 'Сильно мешает'; return direction === 'positive' ? 'Существенно улучшило' : 'Критично мешает'; }
export function progressPercent(current: number, target: number) { return Math.min(100, Math.round((current / Math.max(target, 1)) * 100)); }
export function areFiltersActive(filters: DeltaMapFilters) { return filters.direction !== 'all' || filters.status !== 'all' || filters.categorySlug !== 'all'; }
export function deltaMatchesFilters(delta: DeltaMapItem | DeltaCard, filters: DeltaMapFilters) { return (filters.direction === 'all' || delta.direction === filters.direction) && (filters.status === 'all' || delta.status === filters.status) && (filters.categorySlug === 'all' || delta.category.slug === filters.categorySlug); }
export function buildViewportInput(context: { circleId: string; citySlug: string }, bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }, filters: DeltaMapFilters): DeltaViewportInput { return { circleId: context.circleId, citySlug: context.citySlug, ...bounds, direction: filters.direction === 'all' ? null : filters.direction, status: filters.status === 'all' ? null : filters.status, categorySlug: filters.categorySlug === 'all' ? null : filters.categorySlug }; }
export function formatDateTime(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
export const fallbackCategories: DeltaCategory[] = [{ slug: 'transport', title: 'Транспорт', iconKey: 'transport' }, { slug: 'services', title: 'Услуги', iconKey: 'services' }, { slug: 'urban-environment', title: 'Городская среда', iconKey: 'urban-environment' }];
