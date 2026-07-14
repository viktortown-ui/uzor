import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '../../../app/appMode';
import { findSimilarDeltas } from '../../deltas/deltaApi';
import type { DeltaCategory, DeltaDirection, DeltaImpactLevel, DeltaStatus } from '../../deltas/deltaTypes';
import { demoDeltaMapData } from '../../deltaMap/demoDeltaMapData';
import { getImpactOptions } from '../deltaCreateLogic';
import type { DeltaCreateDraft } from '../deltaCreateTypes';
import {
  buildSimilarSearchInput,
  findDemoSimilarDeltas,
  formatDistance,
  isLocationComplete,
  isWithinPermMvpArea,
  mapSimilarSearchError,
  PERM_MVP_AREA_ERROR,
  type SimilarSearchRow,
} from '../deltaGeoLogic';

const directionLabels: Record<DeltaDirection | '', string> = {
  positive: 'стало лучше',
  negative: 'стало хуже',
  '': 'не выбрано',
};

const periodLabels: Record<string, string> = {
  today: 'Сегодня',
  last_3_days: 'Последние 3 дня',
  last_week: 'Неделя',
  last_2_4_weeks: '2–4 недели',
  '': '',
};

const statusLabels: Record<DeltaStatus, string> = {
  new: 'Новая',
  checking: 'Проверяется',
  confirmed: 'Подтверждена',
  fork: 'Развилка',
  archived: 'Архив',
};

type Props = {
  draft: DeltaCreateDraft;
  update: (patch: Partial<DeltaCreateDraft>, changed?: string) => void;
  categories: DeltaCategory[];
  circleContext: { circleId: string; citySlug: string } | null;
  publishing: boolean;
  onCreateSeparate: () => void;
  onConfirmExisting: (id: string) => void;
  publishError: string;
  authorLocked: boolean;
  onRetryFailed: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
};

function getSimilarSearchKey(draft: DeltaCreateDraft) {
  return [draft.categorySlug || '', draft.direction || '', draft.changeType || '', draft.lat ?? '', draft.lng ?? ''].join('|');
}

function getImpactLabel(direction: DeltaDirection | '', value: DeltaImpactLevel | '') {
  return getImpactOptions(direction).find((option) => option.value === value)?.label ?? '';
}

export function MobileDeltaReviewScreen({
  draft,
  update,
  categories,
  circleContext,
  publishing,
  onCreateSeparate,
  onConfirmExisting,
  publishError,
  authorLocked,
  onRetryFailed,
  headingRef,
}: Props) {
  const [rows, setRows] = useState<SimilarSearchRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'empty' | 'found' | 'error' | 'no-circle' | 'ready'>('loading');
  const [error, setError] = useState('');
  const [confirmSeparate, setConfirmSeparate] = useState(false);
  const sequenceRef = useRef(0);
  const lastAutomaticSearchKeyRef = useRef<string | null>(null);
  const searchKey = getSimilarSearchKey(draft);

  const runSearch = useCallback(async (force = false) => {
    if (!draft.categorySlug || !draft.direction || !draft.changeType || !isLocationComplete(draft) || !isWithinPermMvpArea(draft.lat, draft.lng)) {
      setStatus('error');
      setError(PERM_MVP_AREA_ERROR);
      return;
    }

    if (!force && (draft.similarDecision || lastAutomaticSearchKeyRef.current === searchKey)) return;
    lastAutomaticSearchKeyRef.current = searchKey;

    const id = ++sequenceRef.current;
    setStatus('loading');
    setError('');

    try {
      if (isDemoMode) {
        const result = findDemoSimilarDeltas(draft, demoDeltaMapData);
        if (id === sequenceRef.current) {
          setRows(result);
          setStatus(result.length ? 'found' : 'empty');
        }
        return;
      }

      if (!circleContext) {
        setStatus('no-circle');
        return;
      }

      const input = buildSimilarSearchInput(draft, circleContext.circleId);
      if (!input) throw new Error('invalid_coordinates');

      const result = await findSimilarDeltas(input);
      if (id === sequenceRef.current) {
        setRows(result.map((row) => ({ ...row, lastActivityAt: row.createdAt, createdAt: row.createdAt })));
        setStatus(result.length ? 'found' : 'empty');
      }
    } catch (caught) {
      if (id === sequenceRef.current) {
        setError(mapSimilarSearchError(caught));
        setStatus('error');
      }
    }
  }, [circleContext, draft, searchKey]);

  useEffect(() => {
    const id = window.setTimeout(() => void runSearch(false), 0);
    return () => {
      window.clearTimeout(id);
      sequenceRef.current += 1;
    };
  }, [runSearch, searchKey]);

  const categoryTitle = categories.find((category) => category.slug === draft.categorySlug)?.title;
  const impact = getImpactLabel(draft.direction, draft.impactLevel);

  return (
    <section className="mobile-delta-screen" aria-busy={publishing || status === 'loading'}>
      <h1 ref={headingRef} tabIndex={-1}>Проверьте Дельту</h1>
      <article className="mobile-delta-summary">
        <strong>{draft.statement}</strong>
        <p>{categoryTitle} · {directionLabels[draft.direction]}</p>
        <p>{periodLabels[draft.observedWindow]} · {impact}</p>
        <p>{draft.locationLabel}</p>
        <button type="button" onClick={() => update({ currentStep: 2 })}>Изменить описание</button>
        <button type="button" onClick={() => update({ currentStep: 1 })}>Изменить место</button>
      </article>

      {authorLocked && (
        <div role="alert" className="mobile-delta-alert">
          <h2>Это ваша Дельта</h2>
          <p>Первая отметка автора уже закреплена. Другие участники помогут её проверить.</p>
          <Link to={`/map?delta=${draft.selectedSimilarDeltaId || ''}`}>Показать на карте</Link>
          <button type="button" onClick={() => update({ selectedSimilarDeltaId: null, similarDecision: null })}>Вернуться к похожим</button>
          <button type="button" onClick={() => update({ currentStep: 2 })}>Изменить Дельту</button>
        </div>
      )}

      {publishError && (
        <div role="alert" className="mobile-delta-alert">
          <h2>Не удалось выполнить действие</h2>
          <p>{publishError}</p>
          <button type="button" disabled={publishing} onClick={onRetryFailed}>Повторить</button>
        </div>
      )}

      {status === 'loading' && <p role="status">Проверяем похожие Дельты рядом…</p>}
      {status === 'no-circle' && <p role="alert">Нужно войти в круг, чтобы проверить похожие Дельты.</p>}
      {status === 'error' && (
        <div role="alert">
          <h2>Не удалось проверить похожие Дельты</h2>
          <p>{error}</p>
          <button type="button" onClick={() => void runSearch(true)}>Повторить</button>
          <button
            type="button"
            onClick={() => {
              update({ similarDecision: 'separate', selectedSimilarDeltaId: null });
              setStatus('ready');
            }}
          >
            Продолжить без проверки
          </button>
        </div>
      )}

      {(status === 'empty' || status === 'ready') && (
        <>
          <p>{status === 'empty' ? 'Похожих Дельт рядом не найдено' : 'Проверка похожих Дельт пропущена'}</p>
          <button className="mobile-delta-primary" type="button" disabled={publishing} onClick={onCreateSeparate}>
            {publishing ? 'Публикуем Дельту…' : 'Опубликовать Дельту'}
          </button>
        </>
      )}

      {status === 'found' && (
        <div className="mobile-delta-similar">
          <h2>Похожая Дельта уже есть рядом</h2>
          {rows.slice(0, 3).map((row, index) => (
            <article key={row.id} className={index === 0 ? 'strong' : ''}>
              <strong>{row.statement}</strong>
              <p>{statusLabels[row.status]} · {row.locationLabel} · {formatDistance(row.distanceMeters)}</p>
              <p>Подтверждают {row.confirmCount}</p>
              <button
                type="button"
                disabled={publishing}
                onClick={() => {
                  update({ selectedSimilarDeltaId: row.id, similarDecision: 'existing' });
                  onConfirmExisting(row.id);
                }}
              >
                {publishing ? 'Подтверждаем Дельту…' : 'Это то же изменение'}
              </button>
              <button type="button" disabled={publishing} onClick={() => setConfirmSeparate(true)}>Это другое изменение</button>
            </article>
          ))}
          {confirmSeparate && (
            <div role="dialog" className="mobile-delta-alert">
              <h2>Создать отдельную Дельту?</h2>
              <p>Рядом уже есть похожее изменение. Создавайте новую только если место или характер изменения отличаются.</p>
              <button type="button" onClick={() => setConfirmSeparate(false)}>Вернуться</button>
              <button className="mobile-delta-primary" type="button" disabled={publishing} onClick={onCreateSeparate}>Создать отдельную</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
