import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  window.history.pushState(null, '', '/');
});

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const renderHashAt = (hashPath: string) => {
  window.history.pushState(null, '', `/uzor/${hashPath}`);
  return render(<HashRouter><App /></HashRouter>);
};

describe('app', () => {
  it('мастер вклада проходит 4 шага и показывает кнопку', async () => {
    const u = userEvent.setup();
    renderAt('/contribute?layer=tension');
    await u.click(screen.getByRole('button', { name: 'Дольше ждать транспорт' }));
    await u.click(screen.getByRole('button', { name: 'Работающие' }));
    await u.click(screen.getByRole('button', { name: 'Больше времени в дороге' }));
    expect(screen.getByRole('button', { name: 'Вплести в УЗОР' })).toBeInTheDocument();
  });

  it('demo mode показывает заметный бейдж', () => {
    renderAt('/');
    expect(screen.getByText('ДЕМО — данные вымышлены')).toBeInTheDocument();
  });

  it('reduced-motion режим не ломает сценарий', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (q: string) => ({
        matches: q.includes('reduced'),
        media: q,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    const u = userEvent.setup();
    renderAt('/contribute?layer=support');
    await u.click(screen.getByRole('button', { name: 'Появился удобный маршрут' }));
    expect(screen.getByText('Кого сильнее касается')).toBeInTheDocument();
  });

  it('рендерит главную страницу в HashRouter на GitHub Pages base path без basename', () => {
    renderHashAt('#/');

    expect(screen.getByRole('link', { name: 'УЗОР' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Время города' })).toBeInTheDocument();

    const firstLayer = screen.getByRole('link', { name: 'Стало сложнее' });
    const layers = firstLayer.closest('.layers');
    expect(layers).toBeInTheDocument();
    expect(within(layers as HTMLElement).getByRole('link', { name: 'Стало сложнее' })).toBeInTheDocument();
    expect(within(layers as HTMLElement).getByRole('link', { name: 'Стало лучше' })).toBeInTheDocument();
    expect(within(layers as HTMLElement).getByRole('link', { name: 'Можно изменить' })).toBeInTheDocument();
  });

  it('рендерит join route в HashRouter с query code на GitHub Pages base path', () => {
    renderHashAt('#/join?code=TEST');

    expect(screen.getByRole('link', { name: 'УЗОР' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Вход в закрытый круг' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEST')).toBeInTheDocument();
  });
});
