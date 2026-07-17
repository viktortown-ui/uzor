import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './pwaStatus.css';

type ConnectivityNotice = 'offline' | 'restored' | null;

export function PwaStatus() {
  const [connectivity, setConnectivity] = useState<ConnectivityNotice>(() => navigator.onLine ? null : 'offline');
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    let recoveryTimer: number | undefined;
    const handleOffline = () => {
      window.clearTimeout(recoveryTimer);
      setConnectivity('offline');
    };
    const handleOnline = () => {
      setConnectivity('restored');
      recoveryTimer = window.setTimeout(() => setConnectivity(null), 4000);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.clearTimeout(recoveryTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!needRefresh && !connectivity) return null;

  return (
    <aside className="pwa-status-layer" aria-label="Состояние приложения">
      {needRefresh && (
        <section className="pwa-status-card pwa-status-card--update" role="alertdialog" aria-label="Доступно обновление приложения">
          <p>Доступна новая версия</p>
          <div className="pwa-status-actions">
            <button type="button" className="pwa-status-primary" onClick={() => void updateServiceWorker(true)}>Обновить</button>
            <button type="button" onClick={() => setNeedRefresh(false)}>Позже</button>
          </div>
        </section>
      )}
      {connectivity && (
        <section className="pwa-status-card" role="status" aria-live="polite">
          {connectivity === 'offline'
            ? 'Нет сети. Доступны сохранённые части приложения.'
            : 'Соединение восстановлено.'}
        </section>
      )}
    </aside>
  );
}
