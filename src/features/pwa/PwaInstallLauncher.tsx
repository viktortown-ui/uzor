import { hasPwaDebugParam, usePwaInstall } from './PwaInstallProvider';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMediaQuery } from '../../app/useMediaQuery';

function launcherLabel(canInstall: boolean, pending: boolean, prompting: boolean, embedded: boolean) {
  if (pending) return 'Устанавливаем…';
  if (prompting) return 'Открываем…';
  if (canInstall) return 'Установить УЗОР';
  return embedded ? 'Открыть в Chrome' : 'Как установить';
}

export function PwaInstallLauncher() {
  const install = usePwaInstall();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [collisionState, setCollisionState] = useState(0);
  useEffect(() => { const observer=new MutationObserver(()=>setCollisionState((value)=>value+1)); observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-delta-desktop-inspector','data-delta-mobile-card','data-delta-filter-sheet']}); return()=>observer.disconnect(); },[]);
  const inspectorOpen = pathname === '/map' && !isMobile && document.documentElement.hasAttribute('data-delta-desktop-inspector');
  const mobileMapObscured = pathname === '/map' && isMobile && (document.documentElement.hasAttribute('data-delta-mobile-card') || document.documentElement.hasAttribute('data-delta-filter-sheet'));
  void collisionState;
  if (!install.visible) return null;
  if ((pathname === '/contribute' && isMobile) || (pathname === '/map' && isMobile) || mobileMapObscured) return null;
  const pending = install.isPendingInstall;
  const label = launcherLabel(install.canInstall, pending, install.isPrompting, install.embedded);
  return <aside className={`pwa-install-launcher${pathname === '/map' ? ' pwa-install-launcher--map' : ''}${inspectorOpen ? ' pwa-install-launcher--inspector-open' : ''}`} aria-label="Установка приложения">
    <button type="button" className="pwa-install-launcher__button" onClick={() => install.canInstall ? void install.install() : install.openInstructions()} disabled={install.isPrompting || pending}>{label}</button>
    {install.instructionsOpen && !install.canInstall && !pending && <section className="pwa-install-launcher__sheet" role="dialog" aria-label="Инструкция по установке">
      {install.state === 'embedded' ? <><p>Откройте эту страницу в обычном Chrome, затем выберите «Установить приложение».</p><button type="button" onClick={() => void install.copyCurrentUrl()}>Скопировать ссылку</button></> : install.state === 'ios-open-safari' ? <p>Откройте эту страницу в Safari, затем нажмите «Поделиться» → «На экран Домой».</p> : install.state === 'ios' ? <ol><li>Нажмите «Поделиться».</li><li>Выберите «На экран «Домой»».</li><li>Подтвердите добавление УЗОРА.</li></ol> : <p>Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».</p>}
      <button type="button" onClick={install.closeInstructions}>Понятно</button>
    </section>}
  </aside>;
}

export function PwaInstallDebug() {
  const install = usePwaInstall();
  if (!hasPwaDebugParam()) return null;
  return <section className="pwa-install-debug" aria-label="PWA diagnostics"><button type="button" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(install.diagnostics, null, 2))}>Скопировать диагностику</button><pre>{JSON.stringify(install.diagnostics, null, 2)}</pre></section>;
}
