import { hasPwaDebugParam, usePwaInstall } from './PwaInstallProvider';

function launcherLabel(canInstall: boolean, pending: boolean, prompting: boolean, embedded: boolean) {
  if (pending) return 'Устанавливаем…';
  if (prompting) return 'Открываем…';
  if (canInstall) return 'Установить УЗОР';
  return embedded ? 'Открыть в Chrome' : 'Как установить';
}

export function PwaInstallLauncher() {
  const install = usePwaInstall();
  if (!install.visible) return null;
  const pending = install.isPendingInstall;
  const label = launcherLabel(install.canInstall, pending, install.isPrompting, install.embedded);
  return <aside className="pwa-install-launcher" aria-label="Установка приложения">
    <button type="button" className="pwa-install-launcher__button" onClick={() => install.canInstall ? void install.install() : install.openInstructions()} disabled={install.isPrompting || pending}>{label}</button>
    {install.instructionsOpen && !install.canInstall && !pending && <section className="pwa-install-launcher__sheet" role="dialog" aria-label="Инструкция по установке">
      {install.state === 'embedded' ? <><p>Откройте эту страницу в обычном Chrome, затем выберите «Установить приложение».</p><button type="button" onClick={() => void install.copyCurrentUrl()}>Скопировать ссылку</button></> : install.state === 'ios' ? <ol><li>Нажмите «Поделиться».</li><li>Выберите «На экран «Домой»».</li><li>Подтвердите добавление УЗОРА.</li></ol> : <p>Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».</p>}
      <button type="button" onClick={install.closeInstructions}>Понятно</button>
    </section>}
  </aside>;
}

export function PwaInstallDebug() {
  const install = usePwaInstall();
  if (!hasPwaDebugParam()) return null;
  return <section className="pwa-install-debug" aria-label="PWA diagnostics"><button type="button" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(install.diagnostics, null, 2))}>Скопировать диагностику</button><pre>{JSON.stringify(install.diagnostics, null, 2)}</pre></section>;
}
