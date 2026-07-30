import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import './auth.css';
const RESEND_SECONDS = 30;
export function validatedReturnTo(value: string | null) { return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('://') && !value.startsWith('/auth') ? value : '/wrapped'; }
export function AuthPage() {
  const auth = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const visualState = import.meta.env.VITE_VISUAL_TEST_MODE === 'true' ? new URLSearchParams(location.search).get('visual') : null;
  const intended = useMemo(() => validatedReturnTo(new URLSearchParams(location.search).get('returnTo')), [location.search]);
  const [email,setEmail]=useState(visualState==='otp'?'visual@example.test':''); const [token,setToken]=useState(''); const [step,setStep]=useState<'email'|'code'>(visualState==='otp'?'code':'email');
  const codeRef=useRef<HTMLInputElement>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{if(cooldown<=0)return;const timer=window.setInterval(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[cooldown]);
  const send=async()=>{if(busy)return;setBusy(true);setError('');try{await auth.sendCode(email.trim());setStep('code');setCooldown(RESEND_SECONDS);window.requestAnimationFrame(()=>codeRef.current?.focus())}catch(cause){setError(cause instanceof Error?cause.message:'Не удалось отправить код.')}finally{setBusy(false)}};
  const verify=async()=>{if(busy)return;setBusy(true);setError('');try{await auth.verifyCode(email.trim(),token.trim());navigate(intended,{replace:true})}catch(cause){setError(cause instanceof Error?cause.message:'Код неверный или уже истёк.')}finally{setBusy(false)}};
  if(!visualState&&auth.authenticationState==='loading')return <main className="auth-page"><p role="status">Восстанавливаем безопасную сессию…</p></main>;
  if(!visualState&&auth.authenticationState==='authenticated')return <Navigate replace to={intended}/>;
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title"><Link className="auth-brand" to="/about">УЗОР</Link><p className="eyebrow">Открытая карта Перми</p><h1 id="auth-title">Войти по электронной почте</h1><p>Без пароля и приглашения: пришлём одноразовый код. Адрес не показывается другим участникам.</p>
   {auth.authenticationState==='legacy-anonymous'&&<div className="auth-notice"><strong>Обнаружен прежний гостевой доступ</strong><p>Он остаётся сохранённым, но не является постоянным аккаунтом. Перенос авторства старых записей не выполняется автоматически.</p></div>}
   {step==='email'?<form onSubmit={(event:FormEvent)=>{event.preventDefault();void send()}}><label htmlFor="auth-email">Электронная почта</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/><button type="submit" className="primary" disabled={busy||!email.includes('@')}>{busy?'Отправляем…':'Получить код'}</button></form>:<form onSubmit={(event:FormEvent)=>{event.preventDefault();void verify()}}><p>Код отправлен на <strong>{email}</strong>.</p><label htmlFor="auth-code">Одноразовый код</label><input ref={codeRef} id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" value={token} onChange={event=>setToken(event.target.value.replace(/\D/g,'').slice(0,8))}/><button type="submit" className="primary" disabled={busy||token.length<6}>{busy?'Проверяем…':'Войти'}</button><button type="button" className="secondary-action" disabled={busy||cooldown>0} onClick={()=>void send()}>{cooldown>0?`Повторная отправка через ${cooldown} с`:'Отправить код ещё раз'}</button><button type="button" className="text-action" onClick={()=>setStep('email')}>Изменить почту</button></form>}
   {(error||auth.authenticationError)&&<p role="alert" className="error">{error||auth.authenticationError}</p>}<Link to="/about">Сначала узнать, как работает УЗОР</Link></section></main>;
}
