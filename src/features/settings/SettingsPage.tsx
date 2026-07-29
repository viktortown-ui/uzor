import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductShell } from '../../app/ProductShell';
import { useAuth } from '../auth/AuthProvider';
import { ProductGuide } from '../guide/ProductGuide';
import { usePwaInstallSurface } from '../pwa/usePwaInstallSurface';

const onboardingPrefix='uzor.onboarding.';
export function SettingsPage(){const auth=useAuth();const pwa=usePwaInstallSurface();const [confirm,setConfirm]=useState(false);const cancelRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(confirm) cancelRef.current?.focus()},[confirm]);
 const clearLocal=()=>{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&(key.includes('draft')||key.startsWith(onboardingPrefix)))localStorage.removeItem(key)}setConfirm(false)};
 const replay=()=>{localStorage.removeItem(`${onboardingPrefix}${auth.user?.id??'demo'}`);window.dispatchEvent(new CustomEvent('uzor:replay-onboarding'))};
 return <ProductShell><div className="settings-page"><p className="eyebrow">Управление приложением</p><h1>Настройки</h1><div className="settings-grid">
  <section className="settings-section"><h2>Аккаунт</h2><dl className="settings-meta"><dt>Почта</dt><dd>{auth.user?.email??'Демо-профиль'}</dd><dt>Город</dt><dd>Пермь</dd><dt>Доступ</dt><dd>{auth.membership?'Открытое городское пространство · участник':'Подключение проверяется'}</dd></dl>{auth.state==='legacy-anonymous'&&<p>Это прежняя гостевая сессия. Авторство не переносится автоматически.</p>}<button onClick={auth.signOut}>Выйти</button></section>
  <section className="settings-section"><h2>Как пользоваться УЗОРом</h2><ProductGuide compact/><div className="settings-actions"><button onClick={replay}>Повторить знакомство</button><Link to="/map">Карта</Link><Link to="/contribute">Добавить Дельту</Link><Link to="/pulse">Пульс недели</Link></div></section>
  <section className="settings-section"><h2>Как читать данные</h2><p><strong>Наблюдение</strong> сообщает о замеченном изменении. Подтверждение и неподтверждение — независимые отклики жителей. Новая Дельта проходит проверку и может стать подтверждённой; разные оценки создают развилку, а не «проигравшее» мнение. Неактуальные Дельты архивируются. Неопределённость сохраняется: мнение группы не является официальным фактом.</p></section>
  <section className="settings-section"><h2>Приватность</h2><p>Точные координаты не публикуются: публичное место округляется. Почта автора и идентификатор пользователя не показываются. Дельты — коллективные сигналы, а не официальные жалобы или статистика.</p></section>
  <section className="settings-section"><h2>Приложение</h2><p>Версия {__APP_VERSION__} · сборка {__BUILD_ID__}</p><div className="settings-actions">{pwa.canInstall&&<button onClick={pwa.install}>Установить приложение</button>}<Link to="/about">Открыть публичный гид</Link></div></section>
  <section className="settings-section"><h2>Локальные данные</h2><p>Удаляются только черновики и отметка о прохождении знакомства на этом устройстве. Данные сервера останутся.</p><button className="danger-action" onClick={()=>setConfirm(true)}>Очистить локальные данные</button></section>
 </div>{confirm&&<div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-title" onKeyDown={e=>{if(e.key==='Escape')setConfirm(false)}}><div><h2 id="clear-title">Очистить локальные данные?</h2><p>Дельты и другие серверные записи не удалятся.</p><div className="confirm-dialog__actions"><button ref={cancelRef} onClick={()=>setConfirm(false)}>Отмена</button><button className="danger-action" onClick={clearLocal}>Очистить</button></div></div></div>}</div></ProductShell>}
