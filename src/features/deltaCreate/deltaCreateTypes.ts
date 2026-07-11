import type { DeltaCategory, DeltaChangeType, DeltaDirection, DeltaImpactLevel, DeltaObservedWindow } from '../deltas/deltaTypes';

export type DeltaCreateStep = 1 | 2 | 3 | 4;
export type DeltaStatementMode = 'auto' | 'manual';
export type DeltaCreateCategorySlug = 'transport' | 'services' | 'urban-environment';

export interface DeltaCreateDraft {
  currentStep: DeltaCreateStep;
  districtCode: string;
  districtLabel: string;
  locationHint: string;
  direction: DeltaDirection | '';
  categorySlug: DeltaCreateCategorySlug | '';
  changeType: DeltaChangeType | '';
  subject: string;
  statement: string;
  statementMode: DeltaStatementMode;
  observedWindow: DeltaObservedWindow | '';
  impactLevel: DeltaImpactLevel | '';
  details: string;
}

export interface DeltaCreateOption<T extends string> { value: T; label: string; description?: string; }

export interface DeltaDistrictOption { code: string; label: string; }

// Эти значения должны совпадать с seed migration 006. На этапе 3.2 источник будет заменён на loadDeltaCategories().
export const DELTA_CREATE_CATEGORIES: Array<DeltaCategory & { slug: DeltaCreateCategorySlug }> = [
  { slug: 'transport', title: 'Транспорт и дорога', description: 'Изменения времени дороги, ожидания и городской мобильности.', iconKey: 'transport' },
  { slug: 'services', title: 'Доступность услуг', description: 'Изменения доступности повседневных городских и бытовых услуг.', iconKey: 'services' },
  { slug: 'urban-environment', title: 'Городская среда', description: 'Изменения удобства, состояния и качества городской среды.', iconKey: 'urban-environment' },
];

export const DELTA_CREATE_DISTRICTS: DeltaDistrictOption[] = [
  { code: 'dzerzhinsky', label: 'Дзержинский район' },
  { code: 'industrialny', label: 'Индустриальный район' },
  { code: 'kirovsky', label: 'Кировский район' },
  { code: 'leninsky', label: 'Ленинский район' },
  { code: 'motovilikhinsky', label: 'Мотовилихинский район' },
  { code: 'ordzhonikidzevsky', label: 'Орджоникидзевский район' },
  { code: 'sverdlovsky', label: 'Свердловский район' },
  { code: 'perm-all', label: 'По всей Перми' },
  { code: 'other', label: 'Другое место' },
];

export const DELTA_CREATE_STORAGE_KEY = 'uzor_delta_create_core_v1';
