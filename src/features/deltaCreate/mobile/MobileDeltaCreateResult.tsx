import { Link } from 'react-router-dom';
import type { DeltaCard, DeltaEffect, ReactToDeltaResult } from '../../deltas/deltaTypes';
import { buildDeltaSharePayload } from '../deltaCreateProductionLogic';

export function MobileDeltaCreateResult({ mode, delta, reaction, effect, onReset, onShare, shareStatus }: { mode:'created_new'|'confirmed_existing'; delta:DeltaCard; reaction?:ReactToDeltaResult; effect?:DeltaEffect; onReset:()=>void; onShare:(p:{title:string;text:string;url:string})=>void; shareStatus:string }) {
  const title = mode === 'created_new' ? 'Дельта опубликована' : 'Вы подтвердили Дельту';
  const copy = effect?.detail || reaction?.effect?.detail || (mode === 'created_new' ? 'Первая отметка закреплена. Теперь круг сможет независимо проверить изменение.' : 'Ваш отклик усилил изменение.');
  return <section className="mobile-delta-flow mobile-delta-result" aria-live="polite"><div className="mobile-delta-result-card"><div className="mobile-delta-marker" aria-hidden="true">Δ</div><h1 tabIndex={-1}>{title}</h1><strong>{delta.statement}</strong><p>{copy}</p><Link className="mobile-delta-primary" to={`/map?delta=${delta.id}`}>Показать на карте</Link><button type="button" onClick={()=>onShare(buildDeltaSharePayload(delta, mode))}>Поделиться</button>{shareStatus&&<p role="status">{shareStatus}</p>}<button type="button" onClick={onReset}>Добавить ещё</button><Link to="/pulse">Вернуться в Пульс</Link></div></section>;
}
