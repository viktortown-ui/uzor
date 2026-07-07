import { Link } from 'react-router-dom';
import { copyOptions, scales, scenarios, views } from './labData';
import type { LabCopy, LabScale, LabScenario, LabView } from './labTypes';

function href(next: Partial<{ view: LabView; scale: LabScale; scenario: LabScenario; copy: LabCopy }>, current: { view: LabView; scale: LabScale; scenario: LabScenario; copy: LabCopy }) {
  const p = new URLSearchParams({ view: next.view ?? current.view, scale: String(next.scale ?? current.scale), scenario: next.scenario ?? current.scenario, copy: next.copy ?? current.copy });
  return `/lab?${p.toString()}`;
}
export function LabSwitchers(props: { view: LabView; scale: LabScale; scenario: LabScenario; copy: LabCopy }) {
  return <div className="lab-switchboard" aria-label="Переключатели лаборатории">
    <div>{views.map((v) => <Link key={v.id} className={props.view === v.id ? 'active' : ''} to={href({ view: v.id }, props)}>{v.label}</Link>)}</div>
    <div>{scales.map((s) => <Link key={s} className={props.scale === s ? 'active' : ''} to={href({ scale: s }, props)}>{s.toLocaleString('ru-RU')} участников</Link>)}</div>
    <div>{scenarios.map((s) => <Link key={s.id} className={props.scenario === s.id ? 'active' : ''} to={href({ scenario: s.id }, props)}>{s.label}</Link>)}</div>
    <div>{(Object.keys(copyOptions) as LabCopy[]).map((c) => <Link key={c} className={props.copy === c ? 'active' : ''} to={href({ copy: c }, props)}>Формулировка {c.toUpperCase()}</Link>)}</div>
  </div>;
}
