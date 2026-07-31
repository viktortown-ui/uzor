import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductShell } from '../../app/ProductShell';
import { useAuth } from '../auth/AuthProvider';
import { ProductGuide } from '../guide/ProductGuide';
import { useDialogFocus } from '../guide/useDialogFocus';
import { usePwaInstallSurface } from '../pwa/usePwaInstallSurface';

const onboardingPrefix = 'uzor.onboarding.';
const draftKeys = ['uzor_delta_create_core_v1', 'uzor_delta_create_geo_v1', 'uzor_delta_create_v1'] as const;
const feedbackUrl = 'https://github.com/viktortown-ui/uzor/issues';
export const formatApplicationVersion = (version: string, build: string) => version === '0.0.0'
  ? `Версия пока не назначена · сборка ${build}`
  : `Версия ${version} · сборка ${build}`;
const pwaLabels: Record<string, string> = {
  installed: 'Приложение установлено', eligible: 'Установка доступна', pending: 'Установка завершается…',
  prompting: 'Ожидаем ответ браузера…', error: 'Не удалось запустить установку', ios: 'Установите через меню «Поделиться»',
  'ios-open-safari': 'Для установки откройте страницу в Safari', embedded: 'Откройте страницу в обычном браузере', manual: 'Доступна ручная установка', waiting: 'Браузер не предлагает установку',
};

export function SettingsPage() {
  const auth = useAuth();
  const pwa = usePwaInstallSurface();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeConfirm = useCallback(() => setConfirm(false), []);
  useDialogFocus(confirm, dialogRef, closeConfirm);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setSignOutError('');
    try { await auth.signOut(); } catch { setSignOutError('Не удалось выйти. Проверьте интернет и повторите.'); }
    finally { setSigningOut(false); }
  };
  const clearLocal = () => {
    draftKeys.forEach((key) => localStorage.removeItem(key));
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index); if (key?.startsWith(onboardingPrefix)) localStorage.removeItem(key);
    }
    setConfirm(false); setNotice('Локальные черновики и отметка о знакомстве удалены. Вход и данные на сервере сохранены.');
  };
  const replay = () => {
    localStorage.removeItem(`${onboardingPrefix}${auth.user?.id ?? 'demo'}`);
    window.dispatchEvent(new CustomEvent('uzor:replay-onboarding'));
  };

  return <ProductShell><div className="settings-page"><p className="eyebrow">Управление приложением</p><h1>Настройки</h1>{notice && <p className="settings-notice" role="status">{notice}</p>}<div className="settings-grid">
    <section className="settings-section"><h2>Аккаунт</h2><dl className="settings-meta"><dt>Почта</dt><dd>{auth.user?.email ?? 'Демо-профиль'}</dd><dt>Город</dt><dd>Пермь</dd><dt>Доступ</dt><dd>{auth.accessState === 'ready' ? `Открытое городское пространство · ${auth.membership?.role === 'curator' ? 'куратор' : 'участник'}` : auth.accessState === 'loading' ? 'Проверяем подключение' : auth.accessState === 'error' ? 'Ошибка подключения' : 'Открытое пространство сейчас недоступно'}</dd></dl><button className="secondary-action" disabled={signingOut} onClick={() => void handleSignOut()}>{signingOut ? 'Выходим…' : 'Выйти'}</button>{signOutError && <p role="alert" className="error">{signOutError}</p>}</section>
    <section className="settings-section"><h2>О приложении и инструкция</h2><ProductGuide compact /><div className="settings-actions"><button className="secondary-action" onClick={replay}>Повторить знакомство</button><Link to="/about">Полная инструкция</Link></div></section>
    <section className="settings-section"><h2>Обратная связь</h2><p>Сообщить о проблеме или предложить улучшение можно в публичном разделе проекта. Не добавляйте туда почту, точные координаты и другие личные данные.</p><a href={feedbackUrl} target="_blank" rel="noopener noreferrer">Открыть раздел обратной связи</a></section>
    <section className="settings-section"><h2>Конфиденциальность</h2><p>Публичны текст Дельты, категория, статус и приблизительное место. Точные координаты, почта и технические идентификаторы не показываются. Черновики хранятся только в этом браузере. Их очистка не удаляет серверные записи и не завершает сеанс. Вход, отправка данных, актуальная карта и вопросы о будущем требуют интернета.</p></section>
    <section className="settings-section"><h2>Приложение</h2><p>{formatApplicationVersion(__APP_VERSION__, __BUILD_ID__)}</p><p role="status">{pwaLabels[pwa.state] ?? 'Проверяем возможность установки'}</p><div className="settings-actions">{pwa.state !== 'installed' && pwa.state !== 'prompting' && pwa.state !== 'pending' && <button className="secondary-action" onClick={pwa.canInstall ? pwa.install : pwa.openInstructions}>{pwa.canInstall ? 'Установить приложение' : 'Как установить приложение'}</button>}</div></section>
    <section className="settings-section"><h2>Локальные данные</h2><p>Будут удалены черновики Дельт и отметка о прохождении знакомства на этом устройстве. Аккаунт, текущий вход, опубликованные Дельты, предложения и прогнозы на сервере останутся.</p><button className="danger-action" onClick={() => setConfirm(true)}>Очистить локальные данные</button></section>
    <section className="settings-section settings-section--placeholder"><div><h2>Тема</h2><p>Выбор светлой и тёмной темы.</p></div><span aria-label="Скоро">Скоро</span></section>
    <section className="settings-section settings-section--placeholder"><div><h2>Язык</h2><p>Сейчас интерфейс доступен на русском языке.</p></div><span aria-label="Скоро">Скоро</span></section>
  </div>{confirm && <div className="confirm-dialog"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-description"><h2 id="clear-title">Очистить локальные данные?</h2><p id="clear-description">Черновики и отметка о знакомстве будут удалены. Сеанс и все данные на сервере останутся.</p><div className="confirm-dialog__actions"><button className="secondary-action" onClick={closeConfirm}>Отмена</button><button className="danger-action" onClick={clearLocal}>Очистить на устройстве</button></div></div></div>}</div></ProductShell>;
}
