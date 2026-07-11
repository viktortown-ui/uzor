import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { DeltaCard, DeltaEffect, ReactToDeltaResult } from '../deltas/deltaTypes';
import { getDeltaMarkerVisual, progressPercent } from '../deltaMap/deltaMapLogic';
import { buildDeltaSharePayload, getProductionResultCopy, type DeltaCreateResultMode } from './deltaCreateProductionLogic';

type Props = { mode: DeltaCreateResultMode; delta: DeltaCard; reaction?: ReactToDeltaResult; effect?: DeltaEffect; demo?: boolean; onReset: () => void; onShare: (payload: ReturnType<typeof buildDeltaSharePayload>) => void; shareStatus?: string };
export function DeltaCreateResult({ mode, delta, reaction, effect: createEffect, demo, onReset, onShare, shareStatus }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const counts = reaction?.delta ?? delta;
  const effect = reaction?.effect ?? createEffect ?? { message: 'Первая отметка автора закреплена.', detail: 'Другие участники помогут проверить изменение.' };
  const copy = getProductionResultCopy(mode, { effect });
  const visual = getDeltaMarkerVisual({ ...delta, status: counts.status, confirmCount: counts.confirmCount, disconfirmCount: counts.disconfirmCount, confirmationTarget: counts.confirmationTarget });
  const progress = progressPercent(counts.confirmCount, counts.confirmationTarget);
  return <section className="delta-create-card delta-create-result" aria-live="polite">
    <p className="delta-create-badge">{demo ? 'Демо-режим' : mode === 'created_new' ? 'Новая Дельта' : 'Подтверждение'}</p><h1 ref={headingRef} tabIndex={-1}>{copy.title}</h1>
    <div className={`delta-result-marker delta-marker core-${visual.coreTone} ring-${visual.ringTone}`} style={{ ['--marker-size' as string]: `${visual.size + 12}px` }} aria-label={`${visual.label}. ${visual.statusLabel}`}><span className="delta-marker__ring"/><span className="delta-marker__core"><span className={`delta-marker__icon delta-marker__icon--${visual.categoryIcon}`} /></span></div>
    <p>{copy.lead}</p><p>{copy.detail}</p>{demo && <p className="delta-create-note">Демо: изменения не записаны в базу.</p>}
    <article className="delta-create-summary"><dl><dt>Направление</dt><dd>{visual.label}</dd><dt>Категория</dt><dd>{delta.category.title}</dd><dt>Формулировка</dt><dd>{delta.statement}</dd><dt>Место</dt><dd>{delta.location.label}</dd><dt>Статус</dt><dd>{visual.statusLabel}</dd><dt>Подтверждения</dt><dd>{counts.confirmCount} из {counts.confirmationTarget} подтверждений · не подтверждают {counts.disconfirmCount}</dd></dl><div className="delta-progress"><span style={{ width: `${progress}%` }} /></div></article>
    {counts.status === 'confirmed' && !`${copy.lead} ${copy.detail}`.toLocaleLowerCase('ru-RU').includes('дельта подтвердилась') && <p>Дельта подтвердилась</p>}
    <div className="delta-create-result-actions"><Link className="primary" to={`/map?delta=${delta.id}`}>Показать на карте</Link><button type="button" onClick={() => onShare(buildDeltaSharePayload(delta, mode))}>Поделиться Дельтой</button><button type="button" onClick={onReset}>{mode === 'created_new' ? 'Добавить ещё одну' : 'Добавить другую Дельту'}</button><Link to="/wrapped">Перейти в Wrapped</Link></div>{shareStatus && <p role="status">{shareStatus}</p>}
  </section>;
}
