import type { DeltaChangeType } from './deltaTypes';

const labels: Record<DeltaChangeType, string> = {
  faster: 'Стало быстрее', slower: 'Стало медленнее', cheaper: 'Стало дешевле', more_expensive: 'Стало дороже',
  more_available: 'Стало доступнее', less_available: 'Стало менее доступно', more: 'Стало больше', less: 'Стало меньше',
  appeared: 'Появилось', disappeared: 'Исчезло', improved: 'Стало лучше', worsened: 'Стало хуже', other: 'Другое изменение',
};

export const getDeltaChangeTypeLabel = (changeType: DeltaChangeType | '') => changeType ? labels[changeType] : '';
export const getDeltaDisplayTitle = (delta: { subject?: string | null; statement?: string | null }) => delta.subject?.trim() || delta.statement?.trim() || 'Изменение без заголовка';
const normalize = (value?: string | null) => value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU') || '';
export function shouldShowChangeTypeLabel(delta: { subject?: string | null; statement?: string | null; changeType?: DeltaChangeType | '' }) {
  const subject = normalize(delta.subject);
  const statement = normalize(delta.statement);
  if (!delta.changeType || !subject || subject === statement) return false;
  return true;
}
export function getDeltaMetadata(delta: { subject?: string | null; statement?: string | null; changeType?: DeltaChangeType | ''; category?: { title?: string | null } | null }) {
  return [shouldShowChangeTypeLabel(delta) ? getDeltaChangeTypeLabel(delta.changeType || '') : '', delta.category?.title?.trim() || ''].filter(Boolean).join(' · ');
}
export function shouldShowManualStatement(delta: { subject?: string | null; statement?: string | null; changeType?: DeltaChangeType | '' }, manual = false) {
  const statement = normalize(delta.statement); const subject = normalize(delta.subject);
  if (!statement || statement === subject) return false;
  const label = normalize(delta.changeType ? getDeltaChangeTypeLabel(delta.changeType) : '');
  return manual || (statement !== label && statement !== `${subject}: ${label}` && statement !== `${subject} — ${label}` && statement !== `${subject} — ${label}.`);
}
