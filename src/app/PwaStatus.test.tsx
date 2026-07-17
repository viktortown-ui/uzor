import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaStatus } from './PwaStatus';

const pwa = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
}));

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.needRefresh, pwa.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: pwa.updateServiceWorker,
  }),
}));

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('PwaStatus', () => {
  beforeEach(() => {
    setOnline(true);
    pwa.needRefresh = false;
    pwa.setNeedRefresh.mockReset();
    pwa.updateServiceWorker.mockReset();
  });

  afterEach(cleanup);

  it('does not remain visible without a connectivity or update event', () => {
    const { container } = render(<PwaStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an honest offline message and a recovery message', () => {
    render(<PwaStatus />);
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent('Нет сети. Доступны сохранённые части приложения.');

    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.getByRole('status')).toHaveTextContent('Соединение восстановлено.');
  });

  it('shows and postpones a waiting update without reloading', () => {
    pwa.needRefresh = true;
    render(<PwaStatus />);
    expect(screen.getByText('Доступна новая версия')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Позже' }));
    expect(pwa.setNeedRefresh).toHaveBeenCalledWith(false);
    expect(pwa.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('accepts an update without clearing browser storage', () => {
    pwa.needRefresh = true;
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const indexedDelete = vi.fn();
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { deleteDatabase: indexedDelete } });
    render(<PwaStatus />);

    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));

    expect(pwa.updateServiceWorker).toHaveBeenCalledWith(true);
    expect(storageClear).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(indexedDelete).not.toHaveBeenCalled();
    storageClear.mockRestore();
    storageRemove.mockRestore();
  });
});
