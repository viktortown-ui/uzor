import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applyPwaUpdate, dismissPwaUpdate, getPwaRuntimeSnapshot, subscribePwaRuntime } from '../features/pwa/pwaServiceWorkerRegistration';
import './pwaStatus.css';

type ConnectivityNotice = 'offline' | 'restored' | null;

export function PwaStatus() {
  const { pathname } = useLocation();
  const dockHidden = pathname.startsWith('/contribute');
  const [connectivity, setConnectivity] = useState<ConnectivityNotice>(() => navigator.onLine ? null : 'offline');
  const [runtime, setRuntime] = useState(() => getPwaRuntimeSnapshot());

  useEffect(() => subscribePwaRuntime(() => setRuntime(getPwaRuntimeSnapshot())), []);
  useEffect(() => {
    let recoveryTimer: number | undefined;
    const handleOffline = () => { window.clearTimeout(recoveryTimer); setConnectivity('offline'); };
    const handleOnline = () => { setConnectivity('restored'); recoveryTimer = window.setTimeout(() => setConnectivity(null), 4000); };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => { window.clearTimeout(recoveryTimer); window.removeEventListener('offline', handleOffline); window.removeEventListener('online', handleOnline); };
  }, []);

  if (!runtime.needRefresh && !connectivity) return null;
  return <aside className={`pwa-status-layer${dockHidden ? ' pwa-status-layer--dock-hidden' : ''}`} aria-label="Состояние приложения">
    {runtime.needRefresh && <section className="pwa-status-card pwa-status-card--update" role="alertdialog" aria-label="Доступно обновление приложения"><p>Доступна новая версия</p><div className="pwa-status-actions"><button type="button" className="pwa-status-primary" onClick={() => void applyPwaUpdate(true)}>Обновить</button><button type="button" onClick={dismissPwaUpdate}>Позже</button></div></section>}
    {connectivity && <section className="pwa-status-card" role="status" aria-live="polite">{connectivity === 'offline' ? 'Нет сети. Доступны сохранённые части приложения.' : 'Соединение восстановлено.'}</section>}
  </aside>;
}
