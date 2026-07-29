import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import './auth.css';

export function AuthPage() {
  const auth = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const params = new URLSearchParams(location.search); const intended = params.get('returnTo') || '/wrapped';
  const [email, setEmail] = useState(''); const [token, setToken] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email'); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  const send = async () => { setBusy(true); setError(''); try { await auth.sendCode(email.trim()); setStep('code'); setSent(true); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось отправить код.'); } finally { setBusy(false); } };
  const verify = async () => { setBusy(true); setError(''); try { await auth.verifyCode(email.trim(), token.trim()); await auth.bootstrapCity(); navigate(intended, { replace: true }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Неверный или просроченный код.'); } finally { setBusy(false); } };
  if (auth.state === 'loading') return <main className="auth-page"><p role="status">Восстанавливаем безопасную сессию…</p></main>;
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title"><Link className="auth-brand" to="/about">УЗОР</Link><p className="eyebrow">Открытая карта Перми</p><h1 id="auth-title">Войти по электронной почте</h1><p>Без пароля и приглашения: пришлём одноразовый код. Адрес не показывается другим участникам.</p>
    {auth.state === 'legacy-anonymous' && <div className="auth-notice"><strong>Обнаружен прежний гостевой доступ</strong><p>Он остаётся сохранённым, но не является постоянным аккаунтом. Войдите по почте; перенос авторства старых записей не выполняется автоматически.</p></div>}
    {step === 'email' ? <><label htmlFor="auth-email">Электронная почта</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /><button className="primary" disabled={busy || !email.includes('@')} onClick={send}>{busy ? 'Отправляем…' : 'Получить код'}</button></> : <><p>Код отправлен на <strong>{email}</strong>.</p><label htmlFor="auth-code">Одноразовый код</label><input id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" value={token} onChange={event => setToken(event.target.value.replace(/\D/g, '').slice(0, 8))} /><button className="primary" disabled={busy || token.length < 6} onClick={verify}>{busy ? 'Проверяем…' : 'Войти'}</button><button disabled={busy} onClick={send}>{sent ? 'Отправить код ещё раз' : 'Отправить код'}</button><button className="text-link" onClick={() => setStep('email')}>Изменить почту</button></>}
    {(error || auth.error) && <p role="alert" className="error">{error || auth.error}</p>}<Link to="/about">Сначала узнать, как работает УЗОР</Link></section></main>;
}
