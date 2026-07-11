import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import '../features/wrapped/wrapped.css';

const items = [
  { label: 'Wrapped', to: '/wrapped', icon: '▰' },
  { label: 'Карта дельт', to: '/map', icon: '⌖' },
  { label: 'Добавить Дельту', to: '/contribute', icon: '✚' },
];

function ProductNavigation() {
  const { pathname } = useLocation();
  const active = pathname.startsWith('/map') ? '/map' : pathname.startsWith('/contribute') ? '/contribute' : '/wrapped';
  return <>
    <header className="product-mobile-header"><Link to="/wrapped" className="wrapped-brand"><span className="wrapped-pulse">⌁</span><span>УЗОР</span></Link></header>
    <aside className="product-sidebar" aria-label="Основная навигация">
      <Link to="/wrapped" className="wrapped-brand" aria-label="Главная"><span className="wrapped-pulse">⌁</span><span aria-hidden="true">УЗОР</span></Link>
      <nav className="wrapped-nav">{items.map((item) => <Link key={item.to} to={item.to} className={active === item.to ? 'active' : ''} aria-current={active === item.to ? 'page' : undefined}><i>{item.icon}</i><span>{item.label}</span></Link>)}</nav>
    </aside>
    <nav className="product-bottom-nav" aria-label="Основная навигация на мобильном">{items.map((item) => <Link key={item.to} to={item.to} aria-label={`Мобильный раздел ${item.icon}`} className={active === item.to ? 'active' : ''} aria-current={active === item.to ? 'page' : undefined}><i aria-hidden="true">{item.icon}</i><span aria-hidden="true">{item.label}</span></Link>)}</nav>
  </>;
}

export function ProductShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`product-shell ${className}`}><ProductNavigation /><main className="product-main">{children}</main></div>;
}
