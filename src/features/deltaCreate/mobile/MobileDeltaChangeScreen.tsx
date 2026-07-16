import { useMemo, useState, type RefObject } from 'react';
import type { DeltaCategory, DeltaDirection } from '../../deltas/deltaTypes';
import type { DeltaCreateCategorySlug, DeltaCreateDraft } from '../deltaCreateTypes';
import {
  MOBILE_TITLE_MAX_LENGTH,
  MOBILE_TITLE_MIN_LENGTH,
  normalizeMobileTitle,
  validateMobileTitle,
} from './mobileQuickObservation';
import {
  MOBILE_OBSERVATION_PRESETS,
  matchMobileObservationPreset,
  type MobileObservationPreset,
} from './mobileObservationPresets';

type CustomPatch = Partial<DeltaCreateDraft> & Pick<DeltaCreateDraft,
  'categorySlug' | 'direction' | 'changeType' | 'subject' | 'statement'
  | 'statementMode' | 'observedWindow' | 'impactLevel'>;

type Props = {
  draft: DeltaCreateDraft;
  categories: DeltaCategory[];
  catStatus: string;
  retry: () => void;
  errors: string[];
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onPreset: (preset: MobileObservationPreset) => void;
  onCustomSubmit: (patch: CustomPatch) => void;
};

const labels: Record<DeltaCreateCategorySlug, string> = {
  transport: 'Транспорт',
  services: 'Услуги',
  'urban-environment': 'Город',
};

export function MobileDeltaChangeScreen({
  draft,
  categories,
  catStatus,
  retry,
  errors,
  headingRef,
  onPreset,
  onCustomSubmit,
}: Props) {
  const matched = matchMobileObservationPreset(draft);
  const hasExistingObservation = Boolean(
    draft.subject.trim()
    || draft.statement.trim()
    || draft.categorySlug
    || draft.direction
    || draft.changeType,
  );
  const availableCategorySlugs = useMemo(
    () => new Set(categories.map((category) => category.slug)),
    [categories],
  );
  const availableCategories = categories.filter(
    (category): category is DeltaCategory & { slug: DeltaCreateCategorySlug } => category.slug in labels,
  );
  const initialCategory = draft.categorySlug && availableCategorySlugs.has(draft.categorySlug)
    ? draft.categorySlug
    : '';
  const [category, setCategory] = useState<DeltaCreateCategorySlug | ''>(initialCategory);
  const [custom, setCustom] = useState(!matched && hasExistingObservation);
  const [direction, setDirection] = useState<DeltaDirection | ''>(draft.direction);
  const [title, setTitle] = useState(draft.subject || draft.statement);
  const [titleEdited, setTitleEdited] = useState(false);

  const availablePresets = MOBILE_OBSERVATION_PRESETS.filter(
    (item) => availableCategorySlugs.has(item.categorySlug),
  );
  const shown = category
    ? availablePresets.filter((item) => item.categorySlug === category)
    : availablePresets.filter((item) => item.featured);
  const titleError = title ? validateMobileTitle(title) : null;
  const canSubmit = Boolean(category && direction && !titleError);

  const openGlobalCustom = () => {
    setCategory('');
    setCustom(true);
  };

  const openCategoryCustom = (slug: DeltaCreateCategorySlug) => {
    setCategory(slug);
    setCustom(true);
  };

  const submitCustom = () => {
    if (!category || !direction || validateMobileTitle(title)) return;
    const normalizedTitle = normalizeMobileTitle(title);
    const preserveLegacyStatement = !matched && hasExistingObservation && !titleEdited;
    onCustomSubmit({
      categorySlug: category,
      direction,
      changeType: 'other',
      subject: normalizedTitle,
      statement: preserveLegacyStatement ? draft.statement : normalizedTitle,
      statementMode: preserveLegacyStatement ? draft.statementMode : 'manual',
      observedWindow: 'today',
      impactLevel: 'noticeable',
    });
  };

  return (
    <section className="mobile-delta-screen mobile-observation-screen">
      <h1 ref={headingRef} tabIndex={-1}>Что заметили?</h1>
      <p>Выберите готовое наблюдение или опишите своё.</p>

      {errors.length > 0 && (
        <div role="alert" className="mobile-delta-alert">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}

      {catStatus === 'loading' && <p role="status">Загружаем категории…</p>}
      {(catStatus === 'error' || catStatus === 'empty' || (catStatus === 'ready' && availableCategories.length === 0)) && (
        <p role="alert" className="mobile-delta-alert">
          Нет доступных категорий наблюдений. <button type="button" onClick={retry}>Повторить</button>
        </p>
      )}

      {catStatus === 'ready' && availableCategories.length > 0 && (
        <>
          {!custom && (
            <>
              <div className="mobile-observation-categories" aria-label="Категории">
                {availableCategories.map((item) => (
                  <button
                    type="button"
                    className={category === item.slug ? 'active' : ''}
                    aria-pressed={category === item.slug}
                    key={item.slug}
                    onClick={() => setCategory(item.slug)}
                  >
                    {labels[item.slug]}
                  </button>
                ))}
                <button type="button" onClick={openGlobalCustom}>Другое</button>
              </div>
              <div className="mobile-observation-list">
                <h2>{category ? labels[category] : 'Часто отмечают'}</h2>
                {shown.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`mobile-observation-row ${item.direction}${matched?.id === item.id ? ' active' : ''}`}
                    onClick={() => onPreset(item)}
                  >
                    <span>{item.title}</span>
                    <b aria-hidden="true">{matched?.id === item.id ? '✓' : '›'}</b>
                  </button>
                ))}
                {category && (
                  <button type="button" className="mobile-observation-row custom" onClick={() => openCategoryCustom(category)}>
                    <span>Другое изменение</span><b aria-hidden="true">›</b>
                  </button>
                )}
              </div>
            </>
          )}

          {custom && (
            <div className="mobile-observation-custom">
              <button type="button" className="mobile-observation-back" onClick={() => setCustom(false)}>
                ← Готовые наблюдения
              </button>
              <h2>Другое изменение</h2>
              <fieldset>
                <legend>Категория</legend>
                <div className="mobile-observation-categories">
                  {availableCategories.map((item) => (
                    <button
                      type="button"
                      className={category === item.slug ? 'active' : ''}
                      aria-pressed={category === item.slug}
                      key={item.slug}
                      onClick={() => setCategory(item.slug)}
                    >
                      {labels[item.slug]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Направление</legend>
                <div className="mobile-delta-segment">
                  <button type="button" className={direction === 'negative' ? 'mobile-delta-chip active' : 'mobile-delta-chip'} onClick={() => setDirection('negative')}>Стало хуже</button>
                  <button type="button" className={direction === 'positive' ? 'mobile-delta-chip active' : 'mobile-delta-chip'} onClick={() => setDirection('positive')}>Стало лучше</button>
                </div>
              </fieldset>
              <label>
                Короткий заголовок
                <input
                  aria-label="Короткий заголовок"
                  value={title}
                  maxLength={MOBILE_TITLE_MAX_LENGTH}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setTitleEdited(true);
                  }}
                  placeholder="Очередь у врача стала длиннее"
                />
              </label>
              <small>{title.length}/{MOBILE_TITLE_MAX_LENGTH}</small>
              {titleError && <p className="mobile-inline-error" role="alert">{titleError}</p>}
              {!title && <p className="mobile-field-hint">От {MOBILE_TITLE_MIN_LENGTH} до {MOBILE_TITLE_MAX_LENGTH} символов</p>}
              <button className="mobile-delta-primary" type="button" disabled={!canSubmit} onClick={submitCustom}>
                Указать место
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
