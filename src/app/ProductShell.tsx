import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import './productShell.css';

type NavIcon = 'summary' | 'map' | 'add';

type DesktopNavItem = {
  label: string;
  to: string;
  icon: NavIcon;
};

type MobileNavItem = {
  label: string;
  to: string;
  icon: NavIcon;
  kind: 'standard' | 'primary';
};

const desktopItems: DesktopNavItem[] = [
  { label: 'Wrapped', to: '/wrapped', icon: 'summary' },
  { label: 'Карта дельт', to: '/map', icon: 'map' },
  { label: 'Добавить Дельту', to: '/contribute', icon: 'add' },
];

const mobileItems: MobileNavItem[] = [
  { label: 'Итоги', to: '/wrapped', icon: 'summary', kind: 'standard' },
  { label: 'Добавить', to: '/contribute', icon: 'add', kind: 'primary' },
  { label: 'Карта', to: '/map', icon: 'map', kind: 'standard' },
];

function NavigationIcon({ icon, className = '' }: { icon: NavIcon; className?: string }) {
  if (icon === 'add') {
    return (
      <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (icon === 'map') {
    return (
      <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    );
  }

  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4 17h16" />
      <path d="M6 14l3-4 3 3 4-7 2 4" />
      <path d="M5 5v14h14" />
    </svg>
  );
}

function ProductNavigation() {
  const { pathname } = useLocation();
  const active = pathname.startsWith('/map') ? '/map' : pathname.startsWith('/contribute') ? '/contribute' : '/wrapped';
  return <>
    <aside className="product-sidebar" aria-label="Основная навигация">
      <Link to="/wrapped" className="wrapped-brand" ><span className="wrapped-pulse" aria-hidden="true">⌁</span><span>УЗОР</span></Link>
      <nav className="wrapped-nav">{desktopItems.map((item) => <Link key={item.to} to={item.to} className={active === item.to ? 'active' : ''} aria-current={active === item.to ? 'page' : undefined}><NavigationIcon icon={item.icon} /><span>{item.label}</span></Link>)}</nav>
    </aside>
    <nav className="product-bottom-nav" aria-label="Основная мобильная навигация">{mobileItems.map((item) => {
      const isActive = active === item.to;
      const className = item.kind === 'primary' ? `product-bottom-nav__primary${isActive ? ' active' : ''}` : `product-bottom-nav__item${isActive ? ' active' : ''}`;
      return <Link key={item.to} to={item.to} aria-label={item.label} className={className} aria-current={isActive ? 'page' : undefined}>{item.kind === 'primary' ? <span className="product-bottom-nav__primary-icon"><NavigationIcon icon={item.icon} /></span> : <NavigationIcon icon={item.icon} className="product-bottom-nav__icon" />}<span className="product-bottom-nav__label">{item.label}</span></Link>;
    })}</nav>
  </>;
}

export function ProductShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`product-shell ${className}`}><ProductNavigation /><main className="product-main">{children}</main></div>;
}
