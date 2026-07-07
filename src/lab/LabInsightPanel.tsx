import { scaleStatus } from './labData';
import type { LabScale } from './labTypes';
export function LabInsightPanel({ scale }: { scale: LabScale }) { const s = scaleStatus[scale]; return <aside className="lab-insight"><strong>{s.title}</strong><p>{s.body}</p><small>{s.contexts} представленных контекста · туман {Math.round(s.fog * 100)}%</small></aside>; }
