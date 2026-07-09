import { Link } from 'react-router-dom';
import type { WrappedReport } from '../wrappedTypes';

const nav = [
  ['⌁', 'Карта давления', '/'], ['⌘', 'Биржа ожиданий'], ['◉', 'Таро дня'], ['◎', 'Пульс круга'], ['⚑', 'Сигналы'], ['▣', 'Подтемы'], ['◌', 'Радар'], ['▰', 'Wrapped', '/wrapped'], ['♙', 'Профиль'],
] as const;

export function WrappedSidebar({ report }: { report: WrappedReport }) {
  return <aside className="wrapped-sidebar" aria-label="Wrapped navigation">
    <Link to="/" className="wrapped-brand"><span className="wrapped-pulse">⌁</span><span>УЗОР</span></Link>
    <nav className="wrapped-nav">{nav.map(([icon, item, to]) => to ? <Link className={item === 'Wrapped' ? 'active' : ''} to={to} key={item}><i>{icon}</i><span>{item}</span></Link> : <span className="disabled" key={item}><i>{icon}</i><span>{item}</span></span>)}</nav>
    <div className="wrapped-status-card"><i>♨</i><div><small>Ваш статус</small><strong>{report.progress.currentLevel}</strong><em>Точность: {report.summary.accuracy}%</em></div></div>
  </aside>;
}
