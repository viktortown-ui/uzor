import { useState, type RefObject } from 'react';
import type { DeltaCategory, DeltaDirection } from '../../deltas/deltaTypes';
import type { DeltaCreateCategorySlug, DeltaCreateDraft } from '../deltaCreateTypes';
import { MOBILE_OBSERVATION_PRESETS, matchMobileObservationPreset, presetDraftPatch, type MobileObservationPreset } from './mobileObservationPresets';

type Props = { draft: DeltaCreateDraft; update: (patch: Partial<DeltaCreateDraft>, changed?: string) => void; categories: DeltaCategory[]; catStatus: string; retry: () => void; errors: string[]; headingRef?: RefObject<HTMLHeadingElement | null>; onPreset: (preset: MobileObservationPreset) => void; onCustom: () => void };
const labels: Record<DeltaCreateCategorySlug, string> = { transport: 'Транспорт', services: 'Услуги', 'urban-environment': 'Город' };

export function MobileDeltaChangeScreen({ draft, update, categories, catStatus, retry, errors, headingRef, onPreset, onCustom }: Props) {
  const matched = matchMobileObservationPreset(draft);
  const [category, setCategory] = useState<DeltaCreateCategorySlug | ''>(matched?.categorySlug || '');
  const [custom, setCustom] = useState(Boolean(draft.categorySlug && !matched && draft.changeType === 'other'));
  const chooseCategory = (value: DeltaCreateCategorySlug) => { setCategory(value); setCustom(false); };
  const enterCustom = (value: DeltaCreateCategorySlug) => { setCategory(value); setCustom(true); update({ categorySlug: value, changeType: 'other', observedWindow: 'today', impactLevel: 'noticeable', statementMode: 'manual' }); };
  const title = draft.subject.slice(0, 48);
  const meaningful = title.trim().replace(/\s+/g, '').length >= 3;
  const setDirection = (direction: DeltaDirection) => update({ direction, changeType: 'other', observedWindow: 'today', impactLevel: 'noticeable', statementMode: 'manual', subject: title, statement: title, selectedSimilarDeltaId: null, similarDecision: null });
  const setTitle = (value: string) => update({ subject: value, statement: value, statementMode: 'manual' });
  const shown = category ? MOBILE_OBSERVATION_PRESETS.filter((item) => item.categorySlug === category) : MOBILE_OBSERVATION_PRESETS.filter((item) => item.featured);

  return <section className="mobile-delta-screen mobile-observation-screen">
    <h1 ref={headingRef} tabIndex={-1}>Что заметили?</h1><p>Выберите готовое наблюдение или опишите своё.</p>
    {errors.length > 0 && <div role="alert" className="mobile-delta-alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
    {catStatus === 'loading' && <p role="status">Загружаем категории…</p>}
    {(catStatus === 'error' || catStatus === 'empty') && <p role="alert">Не удалось загрузить категории <button type="button" onClick={retry}>Повторить</button></p>}
    {catStatus === 'ready' && <>
      <div className="mobile-observation-categories" aria-label="Категории">
        {categories.filter((item) => item.slug in labels).map((item) => <button type="button" className={category === item.slug ? 'active' : ''} key={item.slug} onClick={() => chooseCategory(item.slug as DeltaCreateCategorySlug)}>{labels[item.slug as DeltaCreateCategorySlug] || item.title}</button>)}
        <button type="button" className={custom && !category ? 'active' : ''} onClick={() => { setCategory('transport'); setCustom(true); }}>Другое</button>
      </div>
      {!custom ? <div className="mobile-observation-list"><h2>{category ? labels[category] : 'Часто отмечают'}</h2>{shown.map((item) => <button type="button" key={item.id} className={`mobile-observation-row ${item.direction}${matched?.id === item.id ? ' active' : ''}`} onClick={() => { update(presetDraftPatch(item)); onPreset(item); }}><span>{item.title}</span><b aria-hidden="true">{matched?.id === item.id ? '✓' : '›'}</b></button>)}{category && <button type="button" className="mobile-observation-row custom" onClick={() => enterCustom(category)}><span>Другое изменение</span><b aria-hidden="true">›</b></button>}</div> : <div className="mobile-observation-custom">
        <button type="button" className="mobile-observation-back" onClick={() => setCustom(false)}>← Готовые наблюдения</button>
        <h2>Другое изменение</h2><div className="mobile-delta-segment"><button type="button" className={draft.direction === 'negative' ? 'mobile-delta-chip active' : 'mobile-delta-chip'} onClick={() => setDirection('negative')}>Стало хуже</button><button type="button" className={draft.direction === 'positive' ? 'mobile-delta-chip active' : 'mobile-delta-chip'} onClick={() => setDirection('positive')}>Стало лучше</button></div>
        <label>Короткий заголовок<input aria-label="Короткий заголовок" value={title} maxLength={48} onChange={(event) => setTitle(event.target.value)} placeholder="Очередь у врача стала длиннее" /></label><small>{title.length}/48</small>
        <button className="mobile-delta-primary" type="button" disabled={!category || !draft.direction || !meaningful} onClick={() => { update({ categorySlug: category, changeType: 'other', subject: title.trim(), statement: title.trim(), statementMode: 'manual', observedWindow: 'today', impactLevel: 'noticeable', selectedSimilarDeltaId: null, similarDecision: null }); onCustom(); }}>Указать место</button>
      </div>}
    </>}
  </section>;
}
