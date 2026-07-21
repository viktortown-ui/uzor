import { hasPwaDebugParam, usePwaInstall } from './PwaInstallProvider';

export function PwaInstallLauncher() {
  const install = usePwaInstall();
  if (!install.visible) return null;
  const nativeReady = install.canInstall;
  const pending = install.isPendingInstall;
  return <aside className="pwa-install-launcher" aria-label="Установка приложения">
    <button type="button" className="pwa-install-launcher__button" onClick={() => nativeReady ? void install.install() : install.openInstructions()} disabled={install.isPrompting || pending}>{pending ? 'Устанавливаем…' : install.isPrompting ? 'Открываем…' : 'Установить УЗОР'}</button>
    {install.instructionsOpen && !nativeReady && !pending && <section className="pwa-install-launcher__sheet" role="dialog" aria-label="Инструкция по установке">
      {install.state === 'ios' ? <ol><li>Нажмите «Поделиться».</li><li>Выберите «На экран «Домой»».</li><li>Подтвердите добавление УЗОРА.</li></ol> : <p>Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».</p>}
      <button type="button" onClick={install.closeInstructions}>Понятно</button>
    </section>}
  </aside>;
}

export function PwaInstallDebug() {
  const install = usePwaInstall();
  if (!hasPwaDebugParam()) return null;
  return <pre className="pwa-install-debug" aria-label="PWA diagnostics">{JSON.stringify(install.diagnostics, null, 2)}</pre>;
}
