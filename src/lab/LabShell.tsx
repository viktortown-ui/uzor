import { Navigate, useSearchParams } from 'react-router-dom';
import { copyOptions, demoBadge, scaleStatus } from './labData';
import { LabConnections } from './LabConnections';
import { LabInsightPanel } from './LabInsightPanel';
import { LabOutlook } from './LabOutlook';
import { LabSummary } from './LabSummary';
import { LabSwitchers } from './LabSwitchers';
import type { LabCopy, LabScale, LabScenario, LabView } from './labTypes';
const isView = (v: string | null): v is LabView => v === 'summary' || v === 'outlook' || v === 'connections';
const isScale = (v: string | null): v is `${LabScale}` => v === '18' || v === '126' || v === '1248';
const isScenario = (v: string | null): v is LabScenario => v === 'shift' || v === 'split' || v === 'relief';
const isCopy = (v: string | null): v is LabCopy => v === 'a' || v === 'b' || v === 'c';
export function LabShell() { const [p] = useSearchParams(); if (![p.get('view'), p.get('scale'), p.get('scenario'), p.get('copy')].some(Boolean)) return <Navigate to="/lab?view=summary&scale=126&scenario=shift&copy=b" replace/>; const rawView = p.get('view'); const rawScale = p.get('scale'); const rawScenario = p.get('scenario'); const rawCopy = p.get('copy'); const view: LabView = isView(rawView) ? rawView : 'summary'; const scale = isScale(rawScale) ? Number(rawScale) as LabScale : 126; const scenario: LabScenario = isScenario(rawScenario) ? rawScenario : 'shift'; const copy: LabCopy = isCopy(rawCopy) ? rawCopy : 'b'; return <main className="lab"><div className="lab-badge">{demoBadge}</div><header className="lab-head"><div><p className="eyebrow">ПОВСЕДНЕВНОЕ ДАВЛЕНИЕ · 30 ДНЕЙ</p><h1>{copyOptions[copy]}</h1><p>Что в повседневной жизни стало тяжелее или легче — и чего люди ждут в ближайший месяц?</p></div><LabInsightPanel scale={scale}/></header><LabSwitchers view={view} scale={scale} scenario={scenario} copy={copy}/><section className="scale-pulse"><b>{scaleStatus[scale].title}</b><span>{scaleStatus[scale].body}</span></section>{view === 'summary' && <LabSummary scale={scale} scenario={scenario}/>} {view === 'outlook' && <LabOutlook scale={scale} scenario={scenario}/>} {view === 'connections' && <LabConnections scale={scale} scenario={scenario}/>}</main>; }
