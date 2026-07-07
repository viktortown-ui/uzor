import { useState } from 'react';
import type { LabV4Data } from './LabV4Types';

type Focus = 'source' | 'flow' | 'consequence' | null;
export function LivingFlowScene({ data, participated }: { data: LabV4Data; participated: boolean }) {
  const [focus, setFocus] = useState<Focus>(null);
  const fork = data.forkPath;
  return <section className={`v4-scene ${data.scenario} ${focus ? 'is-focused' : ''}`} aria-label="Живой поток причин и последствий">
    <div className="v4-secondary v4-secondary-one">{data.secondary[0].source} · {data.secondary[0].change}</div><div className="v4-secondary v4-secondary-two">{data.secondary[1].source} · {data.secondary[1].change}</div>
    <div className="v4-flow-grid">
      <button className="v4-node source" onClick={() => setFocus(focus === 'source' ? null : 'source')}><span>что меняется</span>{data.mainPath.source}</button>
      <button className="v4-node change" onClick={() => setFocus(focus === 'flow' ? null : 'flow')}><span>как ощущается</span>{data.mainPath.change}</button>
      <button className="v4-node result" onClick={() => setFocus(focus === 'consequence' ? null : 'consequence')}><span>к чему приводит</span>{data.mainPath.consequence}</button>
      {fork && <button className="v4-node result fork-result" onClick={() => setFocus('consequence')}><span>ещё один итог</span>{fork.consequence}</button>}
      <button className="v4-lightpath main" aria-label={`${data.mainPath.source} ${data.mainPath.change} ${data.mainPath.consequence}`} onClick={() => setFocus(focus === 'flow' ? null : 'flow')}><i/><i/><i/></button>
      {fork && <button className="v4-lightpath fork" aria-label={`${fork.source} ${fork.change} ${fork.consequence}`} onClick={() => setFocus('flow')}><i/><i/></button>}
    </div>
    {participated && <div className="v4-you-dot">твой отклик входит в картину</div>}
    <p className="v4-scene-note">{data.statusText}</p>
    {focus === 'source' && <div className="v4-popover"><strong>{data.mainPath.source}</strong><p>Сейчас: дорога чаще забирает время.</p><p>Связь: время → усталость.</p><p>Дальше: {data.future.horizons['30 дней'].grow}% ждут усиления в ближайшие 30 дней.</p></div>}
    {focus === 'consequence' && <div className="v4-popover"><strong>Что чаще приводит к этому:</strong><p>Транспорт</p><p>Рабочая нагрузка</p><p>Доступность услуг</p></div>}
    {focus === 'flow' && <div className="v4-popover"><strong>Почему поток заметен</strong><p>Эту связь независимо отметили {data.mainPath.participants} участников.</p><p>Она повторяется в {data.mainPath.contexts} жизненных контекстах.</p><button>Показать, как я вижу это</button></div>}
  </section>;
}
