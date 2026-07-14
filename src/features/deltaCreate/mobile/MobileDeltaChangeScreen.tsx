import type { RefObject, ReactNode } from 'react';
import type { DeltaCategory } from '../../deltas/deltaTypes';
import { buildDeltaStatement, getChangeTypeOptions, getImpactOptions, getSubjectPlaceholder } from '../deltaCreateLogic';
import type { DeltaCreateDraft } from '../deltaCreateTypes';

const periods = [
  { value: 'today', label: 'Сегодня' },
  { value: 'last_3_days', label: 'Последние 3 дня' },
  { value: 'last_week', label: 'Неделя' },
  { value: 'last_2_4_weeks', label: '2–4 недели' },
] as const;

type Props = {
  draft: DeltaCreateDraft;
  update: (patch: Partial<DeltaCreateDraft>, changed?: string) => void;
  categories: DeltaCategory[];
  catStatus: string;
  retry: () => void;
  errors: string[];
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={active ? 'mobile-delta-chip active' : 'mobile-delta-chip'} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

export function MobileDeltaChangeScreen({ draft, update, categories, catStatus, retry, errors, headingRef }: Props) {
  const preview = draft.statementMode === 'auto' ? buildDeltaStatement(draft) : draft.statement;

  return (
    <section className="mobile-delta-screen">
      <h1 ref={headingRef} tabIndex={-1}>Что изменилось?</h1>
      <p>Опишите одно заметное изменение рядом с вами.</p>

      {errors.length > 0 && (
        <div role="alert" className="mobile-delta-alert">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}

      <fieldset>
        <legend>Направление</legend>
        <div className="mobile-delta-segment">
          <Chip active={draft.direction === 'negative'} onClick={() => update({ direction: 'negative' }, 'direction')}>Стало хуже</Chip>
          <Chip active={draft.direction === 'positive'} onClick={() => update({ direction: 'positive' }, 'direction')}>Стало лучше</Chip>
        </div>
      </fieldset>

      <fieldset>
        <legend>Где проявилось изменение?</legend>
        {catStatus === 'loading' && <p role="status">Загружаем категории…</p>}
        {catStatus === 'error' && <p role="alert">Не удалось загрузить категории <button type="button" onClick={retry}>Повторить</button></p>}
        {catStatus === 'empty' && <p role="alert">Категории Дельт пока не настроены <button type="button" onClick={retry}>Повторить</button></p>}
        {catStatus === 'ready' && (
          <div className="mobile-delta-tiles">
            {categories.map((category) => (
              <Chip key={category.slug} active={draft.categorySlug === category.slug} onClick={() => update({ categorySlug: category.slug as DeltaCreateDraft['categorySlug'] }, 'categorySlug')}>
                {category.title}
              </Chip>
            ))}
          </div>
        )}
      </fieldset>

      {draft.direction && (
        <fieldset>
          <legend>Как именно изменилось?</legend>
          <div className="mobile-delta-tiles">
            {getChangeTypeOptions(draft.direction).map((option) => (
              <Chip key={option.value} active={draft.changeType === option.value} onClick={() => update({ changeType: option.value }, 'changeType')}>
                {option.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <label>
        Коротко опишите изменение
        <input value={draft.subject} maxLength={80} onChange={(event) => update({ subject: event.target.value }, 'subject')} placeholder={getSubjectPlaceholder(draft.categorySlug)} />
      </label>

      {preview && (
        <article className="mobile-delta-preview">
          <span>Ваша Дельта</span>
          {draft.statementMode === 'manual' ? (
            <textarea value={draft.statement} maxLength={180} onChange={(event) => update({ statement: event.target.value }, 'statement')} aria-label="Формулировка Дельты" />
          ) : <strong>{preview}</strong>}
          <button type="button" onClick={() => update({ statementMode: draft.statementMode === 'manual' ? 'auto' : 'manual', statement: preview }, 'statement')}>
            {draft.statementMode === 'manual' ? 'Вернуть автоматическую формулировку' : 'Уточнить формулировку'}
          </button>
        </article>
      )}

      <fieldset>
        <legend>Когда заметили?</legend>
        <div className="mobile-delta-tiles">
          {periods.map((option) => <Chip key={option.value} active={draft.observedWindow === option.value} onClick={() => update({ observedWindow: option.value })}>{option.label}</Chip>)}
        </div>
      </fieldset>

      <fieldset>
        <legend>Насколько влияет?</legend>
        <div className="mobile-delta-tiles">
          {getImpactOptions(draft.direction).map((option) => <Chip key={option.value} active={draft.impactLevel === option.value} onClick={() => update({ impactLevel: option.value })}>{option.label}</Chip>)}
        </div>
      </fieldset>

      <details>
        <summary>+ Добавить подробность</summary>
        <textarea value={draft.details} maxLength={500} onChange={(event) => update({ details: event.target.value })} />
        <p>{draft.details.length}/500</p>
      </details>
    </section>
  );
}
