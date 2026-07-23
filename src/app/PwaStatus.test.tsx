import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PwaStatus } from './PwaStatus';

const pwa = vi.hoisted(() => ({
  runtime: { needRefresh: false, offlineReady: false, swUrl: null, registrationScope: null, activeState: null, waitingState: null, installingState: null, controllingScriptURL: null, registrationError: null },
  listeners: new Set<() => void>(),
  applyPwaUpdate: vi.fn(),
  dismissPwaUpdate: vi.fn(() => { pwa.runtime.needRefresh = false; pwa.listeners.forEach((listener) => listener()); }),
}));

vi.mock('../features/pwa/pwaServiceWorkerRegistration', () => ({
  getPwaRuntimeSnapshot: () => pwa.runtime,
  subscribePwaRuntime: (listener: () => void) => { pwa.listeners.add(listener); return () => pwa.listeners.delete(listener); },
  applyPwaUpdate: pwa.applyPwaUpdate,
  dismissPwaUpdate: pwa.dismissPwaUpdate,
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

function renderAt(pathname = '/pulse') {
  return render(<MemoryRouter initialEntries={[pathname]}><PwaStatus /></MemoryRouter>);
}

describe('PwaStatus', () => {
  beforeEach(() => {
    setOnline(true);
    pwa.runtime.needRefresh = false;
    pwa.listeners.clear();
    pwa.applyPwaUpdate.mockReset();
    pwa.dismissPwaUpdate.mockClear();
  });

  afterEach(cleanup);

  it('does not remain visible without a connectivity or update event', () => {
    const { container } = renderAt();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an honest offline message and a recovery message', () => {
    renderAt();
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent('Нет сети. Доступны сохранённые части приложения.');

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.getByRole('status')).toHaveTextContent('Соединение восстановлено.');
  });

  it('shows and postpones a waiting update without reloading', () => {
    pwa.runtime.needRefresh = true;
    renderAt();
    expect(screen.getByText('Доступна новая версия')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Позже' }));
    expect(pwa.dismissPwaUpdate).toHaveBeenCalledOnce();
    expect(pwa.applyPwaUpdate).not.toHaveBeenCalled();
  });

  it('accepts an update without clearing browser storage', () => {
    pwa.runtime.needRefresh = true;
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const indexedDelete = vi.fn();
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { deleteDatabase: indexedDelete } });
    renderAt();

    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));

    expect(pwa.applyPwaUpdate).toHaveBeenCalledWith(true);
    expect(storageClear).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(indexedDelete).not.toHaveBeenCalled();
    storageClear.mockRestore();
    storageRemove.mockRestore();
  });

  it('keeps Pulse notices above the mobile dock', () => {
    setOnline(false);
    renderAt('/pulse');
    expect(screen.getByLabelText('Состояние приложения')).not.toHaveClass('pwa-status-layer--dock-hidden');
  });

  it('uses safe-area-only positioning when the contribute dock is hidden', () => {
    setOnline(false);
    renderAt('/contribute');
    expect(screen.getByLabelText('Состояние приложения')).toHaveClass('pwa-status-layer--dock-hidden');
  });
});
