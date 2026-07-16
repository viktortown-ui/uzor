import type { DeltaChangeType, DeltaDirection, DeltaImpactLevel, DeltaObservedWindow } from '../../deltas/deltaTypes';
import type { DeltaCreateCategorySlug, DeltaCreateDraft } from '../deltaCreateTypes';

export type MobileObservationPreset = {
  id: string;
  categorySlug: DeltaCreateCategorySlug;
  title: string;
  direction: DeltaDirection;
  changeType: DeltaChangeType;
  observedWindow: DeltaObservedWindow;
  impactLevel: DeltaImpactLevel;
  featured?: boolean;
};

const preset = (id: string, categorySlug: DeltaCreateCategorySlug, title: string, direction: DeltaDirection, changeType: DeltaChangeType, featured = false): MobileObservationPreset => ({
  id, categorySlug, title, direction, changeType, observedWindow: 'today', impactLevel: 'noticeable', featured,
});

export const MOBILE_OBSERVATION_PRESETS: MobileObservationPreset[] = [
  preset('transport-wait-longer', 'transport', 'Автобус приходится ждать дольше', 'negative', 'slower', true),
  preset('transport-less-frequent', 'transport', 'Транспорт ходит реже', 'negative', 'less'),
  preset('transport-fare-higher', 'transport', 'Проезд стал дороже', 'negative', 'more_expensive'),
  preset('transport-trip-longer', 'transport', 'Дорога стала занимать больше времени', 'negative', 'slower'),
  preset('transport-more-frequent', 'transport', 'Транспорт стал ходить чаще', 'positive', 'more'),
  preset('transport-road-repaired', 'transport', 'Дорогу отремонтировали', 'positive', 'improved', true),
  preset('transport-stop-improved', 'transport', 'Остановка стала удобнее', 'positive', 'improved'),
  preset('services-queue-longer', 'services', 'Очередь стала длиннее', 'negative', 'slower', true),
  preset('services-booking-harder', 'services', 'Записаться стало сложнее', 'negative', 'less_available'),
  preset('services-price-higher', 'services', 'Услуга стала дороже', 'negative', 'more_expensive'),
  preset('services-queue-shorter', 'services', 'Очередь стала короче', 'positive', 'faster'),
  preset('services-booking-easier', 'services', 'Записаться стало проще', 'positive', 'more_available', true),
  preset('services-new-service', 'services', 'Появилась новая услуга', 'positive', 'appeared'),
  preset('urban-lighting-gone', 'urban-environment', 'Освещение пропало', 'negative', 'disappeared', true),
  preset('urban-dirtier', 'urban-environment', 'Стало грязнее', 'negative', 'worsened'),
  preset('urban-passage-blocked', 'urban-environment', 'Проход перекрыли', 'negative', 'disappeared'),
  preset('urban-lighting-restored', 'urban-environment', 'Освещение восстановили', 'positive', 'appeared'),
  preset('urban-area-tidied', 'urban-environment', 'Территорию привели в порядок', 'positive', 'improved', true),
  preset('urban-passage-added', 'urban-environment', 'Появился удобный проход', 'positive', 'appeared'),
];

export function presetDraftPatch(value: MobileObservationPreset): Partial<DeltaCreateDraft> {
  return { categorySlug: value.categorySlug, direction: value.direction, changeType: value.changeType, subject: value.title, statement: value.title, statementMode: 'manual', observedWindow: value.observedWindow, impactLevel: value.impactLevel, selectedSimilarDeltaId: null, similarDecision: null };
}

export function matchMobileObservationPreset(draft: DeltaCreateDraft) {
  return MOBILE_OBSERVATION_PRESETS.find((item) => item.categorySlug === draft.categorySlug && item.direction === draft.direction && item.changeType === draft.changeType && item.title === draft.subject && item.title === draft.statement);
}
