import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
function Loading({ children }: { children: ReactNode }) { return <div className="route-loading" role="status">{children}</div>; }
export function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth(); const location = useLocation();
  if (auth.authenticationState === 'loading') return <Loading>Проверяем безопасную сессию…</Loading>;
  if (auth.authenticationState === 'error') return <section className="route-error"><h1>Не удалось проверить вход</h1><p role="alert">{auth.authenticationError}</p><button onClick={auth.retryAuthentication}>Повторить</button></section>;
  if (auth.authenticationState !== 'authenticated') return <Navigate replace to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} />;
  return children;
}
export function OpenCityRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthenticatedRoute>{auth.accessState === 'ready' ? children : auth.accessState === 'loading' || auth.accessState === 'idle' ? <Loading>Подключаем пространство Перми…</Loading> : <section className="route-error"><h1>Пермь пока недоступна</h1><p role="alert">{auth.accessError}</p><button onClick={auth.bootstrapCity}>Повторить</button></section>}</AuthenticatedRoute>;
}
