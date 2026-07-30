import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMediaQuery } from './useMediaQuery';
import './productShell.css';

type NavIcon = 'summary' | 'map' | 'add' | 'pulse' | 'forecast' | 'settings';

type NavItem = { label: string; to: string; icon: NavIcon; primary?: boolean };

const desktopItems: NavItem[] = [
  { label: 'Итог недели', to: '/wrapped', icon: 'summary' },
  { label: 'Карта дельт', to: '/map', icon: 'map' },
  { label: 'Добавить Дельту', to: '/contribute', icon: 'add' },
  { label: 'Будущее', to: '/forecast', icon: 'forecast' },
  { label: 'Настройки', to: '/settings', icon: 'settings' },
];

const mobileItems: NavItem[] = [
  { label: 'Пульс', to: '/pulse', icon: 'pulse' },
  { label: 'Карта', to: '/map', icon: 'map' },
  { label: 'Добавить', to: '/contribute', icon: 'add', primary: true },
  { label: 'Будущее', to: '/forecast', icon: 'forecast' },
  { label: 'Настройки', to: '/settings', icon: 'settings' },
];

function NavigationIcon({ icon, className = '' }: { icon: NavIcon; className?: string }) {
  if (icon === 'add') return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M12 5v14M5 12h14" /></svg>;
  if (icon === 'map') return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>;
  if (icon === 'forecast') return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /><path d="M7 5l2 2M17 5l-2 2" /></svg>;
  if (icon === 'pulse') return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 12h3l2-5 4 10 2-5h5" /><circle cx="12" cy="12" r="8" /></svg>;
  if (icon === 'settings') return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" /></svg>;
  return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 17h16" /><path d="M6 14l3-4 3 3 4-7 2 4" /><path d="M5 5v14h14" /></svg>;
}

function desktopActive(pathname: string) {
  if (pathname.startsWith('/map')) return '/map';
  if (pathname.startsWith('/contribute')) return '/contribute';
  if (pathname.startsWith('/forecast')) return '/forecast';
  if (pathname.startsWith('/settings')) return '/settings';
  return '/wrapped';
}

function mobileActive(pathname: string) {
  if (pathname.startsWith('/map')) return '/map';
  if (pathname.startsWith('/contribute')) return '/contribute';
  if (pathname.startsWith('/forecast')) return '/forecast';
  if (pathname.startsWith('/settings')) return '/settings';
  if (pathname.startsWith('/pulse') || pathname.startsWith('/wrapped')) return '/pulse';
  return null;
}

export function DesktopProductShell({ children, className = '', layoutMode = 'document' }: { children: ReactNode; className?: string; layoutMode?: 'document' | 'fullscreen' }) {
  const { pathname } = useLocation();
  const active = desktopActive(pathname);
  return <div className={`product-shell desktop-product-shell product-shell--${layoutMode} ${className}`} data-layout-mode={layoutMode} data-testid="desktop-product-shell"><aside className="product-sidebar" aria-label="Основная навигация"><Link to="/wrapped" className="wrapped-brand"><span className="wrapped-pulse" aria-hidden="true">⌁</span><span>УЗОР</span></Link><nav className="wrapped-nav">{desktopItems.map((item) => <Link key={item.to} to={item.to} className={active === item.to ? 'active' : ''} aria-current={active === item.to ? 'page' : undefined}><NavigationIcon icon={item.icon} /><span>{item.label}</span></Link>)}</nav></aside><main className="product-main">{children}</main></div>;
}

function MobileAppDock() {
  const { pathname } = useLocation();
  const active = mobileActive(pathname);
  return <nav className="mobile-app-dock" aria-label="Мобильная навигация">{mobileItems.map((item) => {
    const isActive = active === item.to;
    return <Link key={item.to} to={item.to} aria-label={item.label} className={item.primary ? `mobile-app-dock__primary${isActive ? ' active' : ''}` : `mobile-app-dock__item${isActive ? ' active' : ''}`} aria-current={isActive ? 'page' : undefined}>{item.primary ? <span className="mobile-app-dock__primary-icon"><NavigationIcon icon={item.icon} /></span> : <NavigationIcon icon={item.icon} className="mobile-app-dock__icon" />}<span className={`mobile-app-dock__label${item.icon === 'settings' ? ' mobile-app-dock__label--settings' : ''}`}>{item.label}</span></Link>;
  })}</nav>;
}

export function MobileProductShell({ children, className = '', mobileDock = 'visible', layoutMode = 'document' }: { children: ReactNode; className?: string; mobileDock?: 'visible' | 'hidden'; layoutMode?: 'document' | 'fullscreen' }) {
  const dockHidden = mobileDock === 'hidden';
  return <div className={`mobile-app-shell mobile-app-shell--${layoutMode} ${dockHidden ? 'mobile-app-shell--dock-hidden' : ''} ${className}`} data-layout-mode={layoutMode} data-testid="mobile-product-shell"><main className="mobile-app-main">{children}</main>{!dockHidden && <MobileAppDock />}</div>;
}

export function ProductShell({ children, className = '', mobileDock = 'visible', layoutMode = 'document' }: { children: ReactNode; className?: string; mobileDock?: 'visible' | 'hidden'; layoutMode?: 'document' | 'fullscreen' }) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  return isMobile ? <MobileProductShell className={className} mobileDock={mobileDock} layoutMode={layoutMode}>{children}</MobileProductShell> : <DesktopProductShell className={className} layoutMode={layoutMode}>{children}</DesktopProductShell>;
}
