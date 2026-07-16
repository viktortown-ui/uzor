import type { DeltaCreateDraft } from '../deltaCreateTypes';
import { isLocationComplete, isWithinPermMvpArea } from '../deltaGeoLogic';

// The database requires statement to contain at least eight trimmed characters.
export const MOBILE_TITLE_MIN_LENGTH = 8;
export const MOBILE_TITLE_MAX_LENGTH = 48;

export function normalizeMobileTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateMobileTitle(value: string): string | null {
  const length = normalizeMobileTitle(value).length;
  if (length < MOBILE_TITLE_MIN_LENGTH) return `Минимум ${MOBILE_TITLE_MIN_LENGTH} символов`;
  if (length > MOBILE_TITLE_MAX_LENGTH) return `Максимум ${MOBILE_TITLE_MAX_LENGTH} символов`;
  return null;
}

export function validateMobileQuickObservation(draft: DeltaCreateDraft): string[] {
  const errors: string[] = [];
  if (!draft.categorySlug) errors.push('Выберите категорию');
  if (!draft.direction) errors.push('Выберите: стало лучше или хуже');
  if (!draft.changeType) errors.push('Выберите тип изменения');
  const titleError = validateMobileTitle(draft.subject);
  if (titleError) errors.push(titleError);
  if (normalizeMobileTitle(draft.statement).length < MOBILE_TITLE_MIN_LENGTH) errors.push('Формулировка слишком короткая');
  if (!draft.observedWindow) errors.push('Выберите период');
  if (!draft.impactLevel) errors.push('Укажите степень влияния');
  return errors;
}

export function isMobileObservationComplete(draft: DeltaCreateDraft) {
  return validateMobileQuickObservation(draft).length === 0;
}

export function canPublishMobileSeparate(draft: DeltaCreateDraft) {
  return isMobileObservationComplete(draft)
    && isLocationComplete(draft)
    && isWithinPermMvpArea(draft.lat, draft.lng)
    && draft.details.length <= 500;
}
