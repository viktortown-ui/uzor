import { useState } from 'react';
import type { DeltaCard, DeltaReaction } from '../deltas/deltaTypes';
import { formatDateTime, getDirectionCopy, getImpactCopy, getObservedWindowCopy, getStatusCopy, progressPercent } from './deltaMapLogic';

type Props = {
  card: DeltaCard | null;
  loading?: boolean;
  reacting?: boolean;
  effect?: string;
  error?: string;
  onClose: () => void;
  onRetry: () => void;
  onReact: (reaction: DeltaReaction) => void;
};

function CardDetails({ card, reacting, effect, error, onReact }: Pick<Props, 'reacting' | 'effect' | 'error' | 'onReact'> & { card: DeltaCard }) {
  const status = getStatusCopy(card.status);
  const progress = progressPercent(card.confirmCount, card.confirmationTarget);
  const statement = card.statement.trim();
  const subject = card.subject.trim();
  return <div className="delta-card-details">
    <dl>
      <div><dt>Период</dt><dd>{getObservedWindowCopy(card.observedWindow)}</dd></div>
      <div><dt>Влияние</dt><dd>{getImpactCopy(card.impactLevel, card.direction)}</dd></div>
      <div><dt>Статус</dt><dd>{status[0]} — {status[1]}</dd></div>
      <div><dt>Подтверждения</dt><dd>{card.confirmCount} из {card.confirmationTarget} · не подтверждают {card.disconfirmCount}</dd></div>
      <div><dt>Последняя активность</dt><dd>{formatDateTime(card.lastActivityAt)}</dd></div>
    </dl>
    <div className="delta-progress" aria-label={`Подтверждено ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
    {statement && statement.toLocaleLowerCase('ru') !== subject.toLocaleLowerCase('ru') && <section><h3>Формулировка</h3><p>{statement}</p></section>}
    {card.details?.trim() && <section><h3>Комментарий автора</h3><p>{card.details}</p></section>}
    {effect && <p className="delta-effect" role="status">{effect}</p>}
    {error && <p className="delta-card-error" role="alert">{error}</p>}
    <div className="delta-card-actions">
      <button disabled={reacting} className={card.viewerReaction === 'confirm' ? 'active' : ''} onClick={() => onReact('confirm')}>{reacting ? 'Сохраняем…' : 'Подтверждаю'}</button>
      <button disabled={reacting} className={card.viewerReaction === 'disconfirm' ? 'active danger' : ''} onClick={() => onReact('disconfirm')}>{reacting ? 'Сохраняем…' : 'Не подтверждаю'}</button>
    </div>
  </div>;
}

function Summary({ card }: { card: DeltaCard }) {
  return <>
    <p className={`delta-card-direction ${card.direction}`}>{getDirectionCopy(card.direction)}</p>
    <h2>{card.subject.trim() || card.statement}</h2>
    <p className="delta-card-category">{card.category.title}</p>
    <p className="delta-card-location">{card.location.label}</p>
    <p className="delta-card-status">{getStatusCopy(card.status)[0]}</p>
  </>;
}

function CardState({ loading, card, error, onRetry, onClose }: Pick<Props, 'loading' | 'card' | 'error' | 'onRetry' | 'onClose'>) {
  if (loading) return <p>Загружаем Дельту…</p>;
  if (!card && error) return <div className="delta-card-load-error" role="alert">
    <p>Не удалось открыть Дельту</p>
    <div className="delta-card-actions"><button onClick={onRetry}>Повторить</button><button onClick={onClose}>Закрыть</button></div>
  </div>;
  return null;
}

export function DesktopDeltaMapCard(props: Props) {
  return <aside className="delta-map-card delta-map-card--desktop" aria-label="Карточка дельты">
    <button className="delta-card-close" onClick={props.onClose} aria-label="Закрыть">×</button>
    {!props.card ? <CardState {...props} /> : <><Summary card={props.card} /><CardDetails card={props.card} reacting={props.reacting} effect={props.effect} error={props.error} onReact={props.onReact} /></>}
  </aside>;
}

export function MobileDeltaMapCard(props: Props) {
  const [expanded, setExpanded] = useState(false);
  return <aside className={`delta-map-card delta-map-card--mobile ${expanded ? 'is-expanded' : 'is-compact'}`} aria-label="Карточка дельты">
    <span className="delta-card-handle" aria-hidden="true" />
    <button className="delta-card-close" onClick={props.onClose} aria-label="Закрыть">×</button>
    {!props.card ? <CardState {...props} /> : <>
      <Summary card={props.card} />
      {expanded && <CardDetails card={props.card} reacting={props.reacting} effect={props.effect} error={props.error} onReact={props.onReact} />}
      <button className="delta-card-toggle" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Свернуть' : 'Подробнее'}</button>
    </>}
  </aside>;
}

export const DeltaMapCard = DesktopDeltaMapCard;
