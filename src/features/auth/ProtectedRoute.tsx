import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth(); const location = useLocation();
  if (auth.state === 'loading') return <div className="route-loading" role="status">Загружаем УЗОР…</div>;
  if (auth.state === 'bootstrap-error') return <section className="route-error"><h1>Не удалось проверить доступ</h1><p role="alert">{auth.error}</p><button onClick={auth.retry}>Повторить</button></section>;
  if (auth.state !== 'authenticated') return <Navigate replace to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} />;
  return children;
}
