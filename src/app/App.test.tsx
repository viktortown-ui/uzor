import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.pushState(null, '', '/');
});

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const renderHashAt = (hashPath: string) => {
  window.history.pushState(null, '', `/uzor/${hashPath}`);
  return render(<HashRouter><App /></HashRouter>);
};

describe('app', () => {
  it('/demo показывает честный бейдж и переключает сценарии', async () => {
    const u = userEvent.setup();
    renderAt('/demo?scenario=fog');
    expect(screen.getAllByText('ДЕМО — вымышленные отклики')[0]).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Туман' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Контур' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Развилка' })).toBeInTheDocument();
    expect(screen.getByText('Пока один независимый отклик.')).toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: 'Контур' }));
    expect(await screen.findByText('Несколько людей независимо увидели одну связь.')).toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: 'Развилка' }));
    expect(await screen.findByText('Люди видят одну причину, но расходятся в последствиях.')).toBeInTheDocument();
  });

  it('production-подобная пустая картина не показывает вымышленные цифры', () => {
    renderAt('/demo?scenario=fog');
    expect(screen.queryByText(/7 независимых/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.69/)).not.toBeInTheDocument();
    expect(screen.getByText('Пока один независимый отклик.')).toBeInTheDocument();
  });

  it('одна нить не показывает техническую силу и объясняет личный след', () => {
    renderAt('/branch/support%7Cs2%7Cc8');
    expect(screen.getByText('Пока личный след. Это ещё не общий вывод круга.')).toBeInTheDocument();
    expect(screen.queryByText(/0\.69|Сила/)).not.toBeInTheDocument();
  });

  it('путь вклада: поле иначе скрыто, открывается, контекст сохраняется, результат остаётся на экране', async () => {
    const u = userEvent.setup();
    renderAt('/contribute?layer=tension');
    expect(screen.getByRole('heading', { name: 'Что ты сейчас узнаёшь?' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Опиши свой след')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'У меня иначе' }));
    expect(screen.getByPlaceholderText('Опиши свой след')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Дольше ждать транспорт' }));
    await u.click(screen.getByRole('button', { name: /Больше времени в дороге/ }));
    await u.click(screen.getByRole('button', { name: 'Работающие' }));
    expect(localStorage.getItem('uzor.preferredContext.v2')).toBe('g0');
    await u.click(screen.getByRole('button', { name: 'Вплести в УЗОР' }));
    expect(await screen.findByText(/Ты (оставил первый след|не один|открыл развилку)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Посмотреть, что изменилось' })).toHaveAttribute('href', '/');
  });

  it('следующий вклад показывает компактный чип сохранённого контекста', async () => {
    localStorage.setItem('uzor.preferredContext.v2', 'g0');
    const u = userEvent.setup();
    renderAt('/contribute?layer=tension');
    await u.click(screen.getByRole('button', { name: 'Дольше ждать транспорт' }));
    await u.click(screen.getByRole('button', { name: /Больше времени в дороге/ }));
    expect(screen.getByText(/Сейчас ты отвечаешь из контекста: Работающие/)).toBeInTheDocument();
  });

  it('рендерит главную страницу в HashRouter на GitHub Pages base path без basename', () => {
    renderHashAt('#/');
    expect(screen.getByRole('link', { name: 'УЗОР' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Куда уходит твой час?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Что забирает/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Что возвращает/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Что можно сдвинуть/ })).toBeInTheDocument();
  });

  it('рендерит join route в HashRouter с query code на GitHub Pages base path', () => {
    renderHashAt('#/join?code=TEST');
    expect(screen.getByRole('link', { name: 'УЗОР' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Вход в закрытый круг' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEST')).toBeInTheDocument();
  });
});
