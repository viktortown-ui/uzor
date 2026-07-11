import type { DeltaChangeType, DeltaDirection, DeltaImpactLevel, DeltaObservedWindow } from '../deltas/deltaTypes';
import { isWithinPermMvpArea } from './deltaGeoLogic';
import { DELTA_CREATE_CATEGORIES, DELTA_CREATE_DISTRICTS, type DeltaCreateCategorySlug, type DeltaCreateDraft, type DeltaCreateOption, type DeltaCreateStep } from './deltaCreateTypes';

const positiveTypes: DeltaCreateOption<DeltaChangeType>[] = [
  { value: 'faster', label: 'Стало быстрее' }, { value: 'cheaper', label: 'Стало дешевле' }, { value: 'more_available', label: 'Стало доступнее' }, { value: 'more', label: 'Стало больше' }, { value: 'appeared', label: 'Появилось' }, { value: 'improved', label: 'Стало лучше' }, { value: 'other', label: 'Другое улучшение' },
];
const negativeTypes: DeltaCreateOption<DeltaChangeType>[] = [
  { value: 'slower', label: 'Стало медленнее' }, { value: 'more_expensive', label: 'Стало дороже' }, { value: 'less_available', label: 'Стало менее доступно' }, { value: 'less', label: 'Стало меньше' }, { value: 'disappeared', label: 'Исчезло' }, { value: 'worsened', label: 'Стало хуже' }, { value: 'other', label: 'Другое ухудшение' },
];
const observedWindows: DeltaObservedWindow[] = ['today', 'last_3_days', 'last_week', 'last_2_4_weeks'];
const impactLevels: DeltaImpactLevel[] = ['noticeable', 'strong', 'critical'];

export function getChangeTypeOptions(direction: DeltaDirection | '') { return direction === 'positive' ? positiveTypes : direction === 'negative' ? negativeTypes : []; }
export function getImpactOptions(direction: DeltaDirection | ''): DeltaCreateOption<DeltaImpactLevel>[] { return direction === 'positive' ? [ { value: 'noticeable', label: 'Заметно помогло' }, { value: 'strong', label: 'Сильно улучшило' }, { value: 'critical', label: 'Существенно улучшило' } ] : [ { value: 'noticeable', label: 'Заметно' }, { value: 'strong', label: 'Сильно мешает' }, { value: 'critical', label: 'Критично мешает' } ]; }
export function getSubjectPlaceholder(categorySlug: DeltaCreateCategorySlug | '') { return categorySlug === 'transport' ? 'Например: ожидание автобуса вечером' : categorySlug === 'services' ? 'Например: запись к специалисту' : categorySlug === 'urban-environment' ? 'Например: освещение возле остановки' : 'Например: ожидание автобуса вечером'; }

const endings: Record<DeltaChangeType, string> = { faster: 'стало быстрее', slower: 'стало дольше', cheaper: 'стала ниже', more_expensive: 'стала выше', more_available: 'стала доступнее', less_available: 'стала менее доступной', more: 'стало больше', less: 'стала меньше', appeared: 'появилось', disappeared: 'исчезло', improved: 'стало лучше', worsened: 'стало хуже', other: 'изменилось' };
const capitalize = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
export function buildDeltaStatement(input: { direction: DeltaDirection | ''; changeType: DeltaChangeType | ''; subject: string }) {
  const subject = input.subject.trim().replace(/\s+/g, ' ');
  if (!subject || !input.changeType) return '';
  return `${capitalize(subject)} ${endings[input.changeType]}`;
}
export function createEmptyDeltaDraft(): DeltaCreateDraft { return { currentStep: 1, districtCode: '', districtLabel: '', locationHint: '', lat: null, lng: null, locationLabel: '', locationPrecision: 'point', locationSource: null, selectedSimilarDeltaId: null, similarDecision: null, direction: '', categorySlug: '', changeType: '', subject: '', statement: '', statementMode: 'auto', observedWindow: '', impactLevel: '', details: '' }; }
export function resetDependentFields(draft: DeltaCreateDraft, changedField: 'direction' | 'subject' | 'changeType'): DeltaCreateDraft {
  const next = { ...draft };
  if (changedField === 'direction' && next.direction && next.changeType && !getChangeTypeOptions(next.direction).some((o) => o.value === next.changeType)) next.changeType = '';
  if (next.statementMode === 'auto') next.statement = buildDeltaStatement(next);
  return next;
}
export function validateDeltaStep(draft: DeltaCreateDraft, step: DeltaCreateStep): string[] {
  const errors: string[] = [];
  if (step === 1) { if (!draft.districtCode || !draft.districtLabel) errors.push('Выберите район или территорию'); }
  if (step === 2) { if (!draft.direction) errors.push('Выберите: стало лучше или хуже'); if (!draft.categorySlug) errors.push('Выберите категорию'); if (!draft.changeType) errors.push('Выберите тип изменения'); if (draft.subject.trim().length < 2) errors.push('Укажите, что именно изменилось'); if (draft.statement.trim().length < 8) errors.push('Формулировка слишком короткая'); }
  if (step === 3) { if (!draft.observedWindow) errors.push('Выберите период'); if (!draft.impactLevel) errors.push('Укажите степень влияния'); if (draft.details.length > 500) errors.push('Пояснение не должно превышать 500 символов'); }
  if (step === 4) { ([1,2,3] as DeltaCreateStep[]).forEach((s) => errors.push(...validateDeltaStep(draft, s))); }
  return errors;
}
export function validateDeltaDraft(draft: DeltaCreateDraft) { return validateDeltaStep(draft, 4); }
export function isStepComplete(draft: DeltaCreateDraft, step: DeltaCreateStep) { return validateDeltaStep(draft, step).length === 0; }
export function serializeDeltaDraft(draft: DeltaCreateDraft) { return JSON.stringify({ ...draft, locationHint: draft.locationHint.slice(0, 120), subject: draft.subject.trim().slice(0, 80), statement: draft.statement.trim().slice(0, 180), details: draft.details.slice(0, 500) }); }
export function restoreDeltaDraft(raw: string | null): DeltaCreateDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DeltaCreateDraft>;
    const draft = { ...createEmptyDeltaDraft(), ...parsed };
    if (![1,2,3,4].includes(draft.currentStep)) return null;
    if (draft.direction && draft.direction !== 'positive' && draft.direction !== 'negative') return null;
    if (draft.categorySlug && !DELTA_CREATE_CATEGORIES.some((c) => c.slug === draft.categorySlug)) return null;
    if (draft.changeType && ![...positiveTypes, ...negativeTypes].some((o) => o.value === draft.changeType)) return null;
    if (draft.observedWindow && !observedWindows.includes(draft.observedWindow)) return null;
    if (draft.impactLevel && !impactLevels.includes(draft.impactLevel)) return null;
    if (draft.statementMode !== 'auto' && draft.statementMode !== 'manual') return null;
    if (draft.lat !== null && (typeof draft.lat !== 'number' || draft.lat < -90 || draft.lat > 90)) draft.lat = null;
    if (draft.lng !== null && (typeof draft.lng !== 'number' || draft.lng < -180 || draft.lng > 180)) draft.lng = null;
    if (draft.lat !== null && draft.lng !== null && !isWithinPermMvpArea(draft.lat, draft.lng)) return null;
    if (!['point','district','city'].includes(draft.locationPrecision)) draft.locationPrecision = 'point';
    if (draft.locationSource !== null && !['search','map','geolocation'].includes(draft.locationSource)) draft.locationSource = null;
    if (draft.districtCode && !DELTA_CREATE_DISTRICTS.some((d) => d.code === draft.districtCode)) return null;
    return draft;
  } catch { return null; }
}
export function clearDeltaDraft() { return null; }
