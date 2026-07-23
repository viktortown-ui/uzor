import { usePwaInstallSurface } from './usePwaInstallSurface';

export function PwaInstallCard() {
  const install = usePwaInstallSurface();
  if (!install.promotionVisible) return null;
  const title = install.canInstall ? 'Установить УЗОР' : install.embedded ? 'Откройте в Chrome' : 'Как установить УЗОР';
  return <section className="mobile-pulse-install" aria-labelledby="mobile-pulse-install-title">
    <div><h2 id="mobile-pulse-install-title">{title}</h2><p>{install.canInstall ? 'Браузер готов к установке приложения.' : install.state === 'waiting' ? 'Ждём, когда браузер подтвердит возможность установки. Пока доступна инструкция.' : 'Открывайте Пульс города с главного экрана и сохраняйте доступ к оболочке при временной потере сети.'}</p></div>
    {install.isPendingInstall && <p role="status">Браузер готовит установку. Карточка исчезнет после подтверждения установки.</p>}
    {install.state === 'error' && <p role="status">Не удалось открыть установку. Можно попробовать позже или открыть инструкцию.</p>}
    <div className="mobile-pulse-install-actions">
      {install.canInstall && <button type="button" onClick={() => void install.install()}>Установить</button>}
      {install.isPrompting && <button type="button" disabled>Открываем…</button>}
      {!install.isPendingInstall && <button type="button" onClick={install.openInstructions}>{install.embedded ? 'Открыть в Chrome' : 'Как установить'}</button>}
      <button type="button" onClick={install.dismissPromotion}>Не сейчас</button>
    </div>
    {install.state === 'embedded' && install.instructionsOpen && <div className="mobile-pulse-install-sheet" role="note" aria-label="Инструкция по установке"><p>Откройте эту страницу в обычном Chrome, затем выберите «Установить приложение».</p><button type="button" onClick={() => void install.copyCurrentUrl()}>Скопировать ссылку</button></div>}
    {install.state === 'ios-open-safari' && install.instructionsOpen && <div className="mobile-pulse-install-sheet" role="note" aria-label="Инструкция по установке"><p>Откройте эту страницу в Safari, затем нажмите «Поделиться» → «На экран Домой».</p></div>}
    {install.state === 'ios' && install.instructionsOpen && <div className="mobile-pulse-install-sheet" role="note" aria-label="Инструкция по установке"><ol><li>Нажмите «Поделиться».</li><li>Выберите «На экран «Домой»».</li><li>Подтвердите добавление «УЗОР».</li></ol></div>}
    {install.instructionsOpen && (install.state === 'waiting' || install.state === 'manual' || install.state === 'error') && <div className="mobile-pulse-install-sheet" role="note" aria-label="Инструкция по установке"><p>Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».</p></div>}
  </section>;
}
