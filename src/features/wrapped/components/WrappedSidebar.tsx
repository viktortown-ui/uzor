import { Link } from 'react-router-dom';
import type { WrappedReport } from '../wrappedTypes';

const nav = [
  ['⌖', 'Карта дельт', '/map'], ['✚', 'Добавить Дельту', '/contribute'], ['▰', 'Wrapped', '/wrapped'],
] as const;

export function WrappedSidebar({ report }: { report: WrappedReport }) {
  return <aside className="wrapped-sidebar" aria-label="Wrapped navigation">
    <Link to="/wrapped" className="wrapped-brand"><span className="wrapped-pulse">⌁</span><span>УЗОР</span></Link>
    <nav className="wrapped-nav">{nav.map(([icon, item, to]) => <Link className={item === 'Wrapped' ? 'active' : ''} to={to} key={item}><i>{icon}</i><span>{item}</span></Link>)}</nav>
    <div className="wrapped-status-card"><i>♨</i><div><small>Ваш статус</small><strong>{report.progress.currentLevel}</strong><em>Точность: {report.summary.accuracy}%</em></div></div>
  </aside>;
}
