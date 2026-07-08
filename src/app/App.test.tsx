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

describe('lab v3', () => {
  it('/lab показывает бейдж, режимы и масштабы', () => {
    renderAt('/lab');
    expect(screen.getByText('ДЕМО-ЛАБОРАТОРИЯ · синтетические данные для проверки визуала')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Сводка' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ожидания' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Связи' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '18 участников' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '126 участников' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1\s*248 участников/ })).toBeInTheDocument();
  });

  it('при переключении масштаба меняется текст статуса', async () => {
    const u = userEvent.setup();
    renderAt('/lab?view=summary&scale=18&scenario=shift&copy=b');
    expect(screen.getAllByText('РАННИЙ СИГНАЛ').length).toBeGreaterThan(0);
    await u.click(screen.getByRole('link', { name: /1\s*248 участников/ }));
    expect((await screen.findAllByText('УСТОЙЧИВЫЙ СИГНАЛ КРУГА')).length).toBeGreaterThan(0);
  });

  it('сценарии показывают понятные итоги', () => {
    const first = renderAt('/lab?view=summary&scale=126&scenario=shift&copy=b');
    expect(screen.getByText('ДАВЛЕНИЕ УСИЛИВАЕТСЯ ↑')).toBeInTheDocument();
    first.unmount();
    const second = renderAt('/lab?view=summary&scale=126&scenario=relief&copy=b');
    expect(screen.getByText('СТАЛО ЛЕГЧЕ ↓')).toBeInTheDocument();
    second.unmount();
    renderAt('/lab?view=summary&scale=126&scenario=split&copy=b');
    expect(screen.getByText(/расходятся/i)).toBeInTheDocument();
  });

  it('лаборатория не вызывает Supabase API и показывает связи расхождения', () => {
    renderAt('/lab?view=connections&scale=126&scenario=split&copy=b');
    expect(screen.getByText('Продукты → Расходы → Свободные деньги')).toBeInTheDocument();
    expect(screen.getByText('Продукты → Тревожность')).toBeInTheDocument();
    expect(screen.queryByText(/Нужна настройка Supabase|Войдите в закрытый круг|Код приглашения/)).not.toBeInTheDocument();
  });
});

describe('lab v4', () => {
  it('/lab/v4 показывает бейдж и главный вывод про транспорт, время и усталость', () => {
    renderAt('/lab/v4');
    expect(screen.getByText('ДЕМО-ЛАБОРАТОРИЯ · синтетические данные')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Транспорт сильнее всего забирает время.' })).toBeInTheDocument();
    expect(screen.getByText(/79 из 126 участников/)).toBeInTheDocument();
    expect(screen.getAllByText('Транспорт').length).toBeGreaterThan(0);
    expect(screen.getByText('Больше времени в дороге')).toBeInTheDocument();
    expect(screen.getAllByText('Усталость').length).toBeGreaterThan(0);
  });

  it('future показывает горизонты и числа ожиданий', () => {
    renderAt('/lab/v4?scale=126&scenario=signal&step=future&copy=a');
    expect(screen.getByRole('button', { name: '7 дней' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30 дней' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6–12 месяцев' })).toBeInTheDocument();
    expect(screen.getByText('46%')).toBeInTheDocument();
    expect(screen.getByText('34%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('why показывает объяснение доверия человеческим языком', () => {
    renderAt('/lab/v4?scale=126&scenario=signal&step=why&copy=a');
    expect(screen.getByRole('button', { name: 'Почему мы это показываем?' })).toBeInTheDocument();
    expect(screen.getByText(/Эта связь повторяется не у одного человека/)).toBeInTheDocument();
  });

  it('fork показывает две разные ветки последствий', () => {
    renderAt('/lab/v4?scale=1248&scenario=fork&step=why&copy=a');
    expect(screen.getByText(/Продукты → расходы → меньше свободных денег/i)).toBeInTheDocument();
    expect(screen.getByText(/Продукты → расходы → больше тревоги/i)).toBeInTheDocument();
  });

  it('выбор Я среди других меняет текст', async () => {
    const u = userEvent.setup();
    renderAt('/lab/v4');
    await u.click(screen.getByRole('button', { name: 'Продукты' }));
    expect(screen.getByText(/меньшая часть круга/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Транспорт' }));
    expect(screen.getByText(/Ты ближе к 42% круга/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Услуги' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Пока не знаю' })).toBeInTheDocument();
  });

  it('не показывает технические значения и не просит Supabase', () => {
    renderAt('/lab/v4');
    expect(screen.queryByText(/0\.69|туман 18%|confidence|coverage|diversity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Нужна настройка Supabase|Код приглашения|Войдите в закрытый круг/)).not.toBeInTheDocument();
  });

  it('важные маршруты продолжают рендериться', () => {
    for (const route of ['/', '/join', '/contribute', '/branch/support%7Cs2%7Cc8', '/curator', '/about', '/demo', '/lab']) {
      const view = renderAt(route);
      expect(document.body.textContent).toMatch(/УЗОР|ДЕМО-ЛАБОРАТОРИЯ/);
      view.unmount();
    }
  });
});

describe('wrapped dashboard', () => {
  it('/wrapped renders demo dashboard', () => {
    renderAt('/wrapped');
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    expect(screen.getAllByText('Ранний наблюдатель').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Транспорт').length).toBeGreaterThan(0);
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('14 ваших сигнала подтвердились')).toBeInTheDocument();
  });

  it('mobile critical text exists on /wrapped', () => {
    renderAt('/wrapped');
    expect(screen.getByText('Эта неделя ▾')).toBeInTheDocument();
    expect(screen.getByText('Поделиться')).toBeInTheDocument();
    expect(screen.getByText('Где вы были правы')).toBeInTheDocument();
    expect(screen.getByText('Ваш прогресс')).toBeInTheDocument();
  });
});
