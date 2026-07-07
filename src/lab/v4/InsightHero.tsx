import type { LabV4Copy, LabV4Data } from './LabV4Types';
import { copyVariants } from './LabV4Data';

export function InsightHero({ data, copy, onParticipate }: { data: LabV4Data; copy: LabV4Copy; onParticipate: (kind: 'match' | 'other') => void }) {
  const variant = copyVariants[copy];
  return <section className="v4-hero" aria-label="Главный вывод лаборатории"><div className="v4-demo-badge">ДЕМО-ЛАБОРАТОРИЯ · синтетические данные</div><p className="v4-market">{variant.title}</p><p className="v4-subtitle">{variant.subtitle}</p><p className="v4-eyebrow">В ТВОЁМ КРУГЕ СЕЙЧАС</p><h1>{data.heroTitle}</h1><p className="v4-hero-body">{data.heroBody}</p><p className="v4-expect">{data.expectationLine}</p><div className="v4-actions"><button onClick={() => onParticipate('match')}>Это похоже на мой опыт</button><button className="ghost" onClick={() => onParticipate('other')}>У меня иначе</button></div></section>;
}
