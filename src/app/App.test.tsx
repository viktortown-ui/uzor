import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { WrappedMobileView, wrappedPeriodLabel } from '../features/wrapped/mobile/WrappedMobileView';
import { shareWrappedReportText, wrappedShareText } from '../features/wrapped/useWrappedShare';
import { wrappedDemoReport } from '../features/wrapped/wrappedDemoData';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.pushState(null, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});


function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const createMql = (query: string) => ({
    media: query,
    get matches() { return query === '(prefers-reduced-motion: reduce)' ? false : matches; },
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => createMql(query)) });
  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches, media: '(max-width: 900px)' } as MediaQueryListEvent));
    },
  };
}

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
  }, 10000);

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
    renderAt('/lab/old-contribute?layer=tension');
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
    expect(screen.getByRole('link', { name: 'Посмотреть, что изменилось' })).toHaveAttribute('href', '/wrapped');
  });

  it('следующий вклад показывает компактный чип сохранённого контекста', async () => {
    localStorage.setItem('uzor.preferredContext.v2', 'g0');
    const u = userEvent.setup();
    renderAt('/lab/old-contribute?layer=tension');
    await u.click(screen.getByRole('button', { name: 'Дольше ждать транспорт' }));
    await u.click(screen.getByRole('button', { name: /Больше времени в дороге/ }));
    expect(screen.getByText(/Сейчас ты отвечаешь из контекста: Работающие/)).toBeInTheDocument();
  });

  it('рендерит Wrapped MVP на root в HashRouter на GitHub Pages base path без basename', () => {
    renderHashAt('#/');
    expect(screen.getByRole('link', { name: /УЗОР/ })).toHaveAttribute('href', '#/wrapped');
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Куда уходит твой час?' })).not.toBeInTheDocument();
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
    for (const route of ['/', '/join', '/contribute', '/branch/support%7Cs2%7Cc8', '/curator', '/about', '/demo', '/lab/old-home', '/lab']) {
      const view = renderAt(route);
      expect(document.body.textContent).toMatch(/УЗОР|ДЕМО-ЛАБОРАТОРИЯ|Что изменилось рядом с вами/);
      view.unmount();
    }
  });
});

describe('wrapped dashboard', () => {

  it('/ redirects to Wrapped MVP while old prototype stays available only under lab/demo paths', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Куда уходит твой час?' })).not.toBeInTheDocument();
    cleanup();
    renderAt('/lab/old-home');
    expect(screen.getByRole('heading', { name: 'Куда уходит твой час?' })).toBeInTheDocument();
  });

  it('clicking Wrapped brand keeps the user on /wrapped and sidebar has only MVP links', async () => {
    const u = userEvent.setup();
    renderAt('/wrapped');
    expect(screen.getByRole('link', { name: /УЗОР/ })).toHaveAttribute('href', '/wrapped');
    expect(screen.getByRole('link', { name: /Карта дельт/ })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: /Добавить Дельту/ })).toHaveAttribute('href', '/contribute');
    expect(screen.getByRole('link', { name: /Wrapped/ })).toHaveAttribute('href', '/wrapped');
    expect(screen.queryByText('Карта давления')).not.toBeInTheDocument();
    expect(screen.queryByText('Куратор')).not.toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: /УЗОР/ }));
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
  });

  it('MVP support routes remain available', () => {
    renderAt('/contribute');
    expect(screen.getByRole('heading', { name: 'Что изменилось рядом с вами?' })).toBeInTheDocument();
    cleanup();
    renderAt('/join');
    expect(screen.getByRole('heading', { name: 'Вход в закрытый круг' })).toBeInTheDocument();
    cleanup();
    renderAt('/curator');
    expect(screen.getByRole('heading', { name: /Куратор|Кандидаты круга/ })).toBeInTheDocument();
    cleanup();
    renderAt('/curator/overview');
    expect(screen.getByRole('heading', { name: /Сводка круга/ })).toBeInTheDocument();
    cleanup();
    renderAt('/lab/wrapped-reference-v2');
    expect(document.body.textContent).toMatch(/Wrapped|УЗОР/i);
  });
  it('/wrapped renders core MVP blocks', () => {
    installMatchMedia(false);
    renderAt('/wrapped');
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    expect(screen.getByText('Ваш итог недели')).toBeInTheDocument();
    expect(screen.getByText('Сигналов за неделю')).toBeInTheDocument();
    expect(screen.getAllByText('Подтверждено').length).toBeGreaterThan(0);
    expect(screen.getByText('Точность')).toBeInTheDocument();
    expect(screen.getByText('Серия недель')).toBeInTheDocument();
    expect(screen.getByText('Что вы замечали')).toBeInTheDocument();
    expect(screen.getByText('Где вы были правы')).toBeInTheDocument();
    expect(screen.getByText('Ваш прогресс')).toBeInTheDocument();
  });


  it('/wrapped renders only mobile story at 900px and below', () => {
    installMatchMedia(true);
    renderAt('/wrapped');
    expect(screen.getByTestId('wrapped-mobile-root')).toBeInTheDocument();
    expect(screen.queryByLabelText('Статус Wrapped')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Личный Wrapped реальности' })).not.toBeInTheDocument();
    expect(screen.queryByText('Сигналов за неделю')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ранний наблюдатель' })).toBeInTheDocument();
  });

  it('/wrapped renders only desktop view above 900px', () => {
    installMatchMedia(false);
    renderAt('/wrapped');
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    expect(screen.queryByTestId('wrapped-mobile-root')).not.toBeInTheDocument();
  });

  it('/wrapped switches responsive views without remounting data state', async () => {
    const media = installMatchMedia(true);
    renderAt('/wrapped');
    expect(screen.getByTestId('wrapped-mobile-root')).toBeInTheDocument();
    media.setMatches(false);
    expect(await screen.findByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 900px)');
  });

  it('mobile Wrapped shows story content and share through navigator.share', async () => {
    installMatchMedia(true);
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { share, clipboard: undefined });
    const u = userEvent.setup();
    renderAt('/wrapped');
    expect(screen.getByText('6–12 июля')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Ранний наблюдатель' })).toHaveLength(1);
    expect(screen.getByText('Вы замечаете сдвиги раньше круга.')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Добавить Дельту' })[0]).toHaveAttribute('href', '/contribute');
    await u.click(screen.getByRole('button', { name: 'Поделиться Wrapped' }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(await screen.findByText('Отчёт скопирован')).toBeInTheDocument();
    expect(screen.getAllByText('Транспорт')[0]).toBeInTheDocument();
    expect(screen.getByText('Рост цен на топливо')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть карту' })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('progressbar', { name: 'Прогресс XP' })).toHaveAttribute('aria-valuenow', '77');
    expect(screen.getByText('Серия: 3 недели')).toBeInTheDocument();
    expect(screen.queryByLabelText('Статус Wrapped')).not.toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('mobile Wrapped cue scrolls without changing the HashRouter route', async () => {
    installMatchMedia(true);
    const scrollIntoView = vi.fn();
    window.history.pushState(null, '', '/uzor/#/wrapped');
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const u = userEvent.setup();
    render(<HashRouter><App /></HashRouter>);
    await u.click(screen.getByRole('button', { name: /Что подтвердил круг/ }));
    expect(window.location.hash).toBe('#/wrapped');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });

  it('mobile Wrapped uses clipboard fallback and reports copy failures honestly', async () => {
    installMatchMedia(true);
    const shareText = wrappedShareText(wrappedDemoReport);
    const writeText = vi.fn(async () => undefined);

    await expect(shareWrappedReportText({ share: undefined, clipboard: { writeText } as unknown as Clipboard }, shareText)).resolves.toBe('success');
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(shareText);
    expect(shareText).toContain('Мой Wrapped недели');

    vi.stubGlobal('navigator', { share: undefined, clipboard: { writeText } });
    const u = userEvent.setup();
    render(<MemoryRouter><WrappedMobileView report={wrappedDemoReport} /></MemoryRouter>);
    await u.click(screen.getByRole('button', { name: 'Поделиться Wrapped' }));
    expect(await screen.findByText('Отчёт скопирован')).toBeInTheDocument();

    cleanup();
    const rejectedWriteText = vi.fn(async () => { throw new Error('denied'); });
    await expect(shareWrappedReportText({ share: undefined, clipboard: { writeText: rejectedWriteText } as unknown as Clipboard }, shareText)).resolves.toBe('failure');
    vi.stubGlobal('navigator', { share: undefined, clipboard: { writeText: rejectedWriteText } });
    render(<MemoryRouter><WrappedMobileView report={wrappedDemoReport} /></MemoryRouter>);
    await u.click(screen.getByRole('button', { name: 'Поделиться Wrapped' }));
    expect(await screen.findByText('Не удалось поделиться отчётом')).toBeInTheDocument();
  });

  it('mobile Wrapped unavailable and rejected native share paths remain honest', async () => {
    installMatchMedia(true);
    const shareText = wrappedShareText(wrappedDemoReport);
    await expect(shareWrappedReportText({ share: undefined, clipboard: undefined }, shareText)).resolves.toBe('failure');

    const nativeShare = vi.fn(async () => { throw new Error('cancelled'); });
    await expect(shareWrappedReportText({ share: nativeShare, clipboard: undefined }, shareText)).resolves.toBe('cancelled');
    expect(nativeShare).toHaveBeenCalledTimes(1);

    expect(screen.queryByText('Отчёт скопирован')).not.toBeInTheDocument();
  });

  it('mobile Wrapped formats Russian periods across month boundaries', () => {
    expect(wrappedPeriodLabel('2026-07-06', '2026-07-12')).toBe('6–12 июля');
    expect(wrappedPeriodLabel('2026-07-29', '2026-08-04')).toBe('29 июля — 4 августа');
    expect(wrappedPeriodLabel('bad-date', '2026-08-04')).toBe('bad-date — 2026-08-04');
  });

  it('mobile Wrapped pluralizes week streak labels', () => {
    installMatchMedia(true);
    for (const [count, label] of [[1, 'Серия: 1 неделя'], [2, 'Серия: 2 недели'], [5, 'Серия: 5 недель'], [21, 'Серия: 21 неделя']] as const) {
      cleanup();
      render(<MemoryRouter><WrappedMobileView report={{ ...wrappedDemoReport, summary: { ...wrappedDemoReport.summary, weekStreak: count } }} /></MemoryRouter>);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('/wrapped does not show dead nav/buttons', () => {
    renderAt('/wrapped');
    expect(screen.queryByText('Биржа ожиданий')).not.toBeInTheDocument();
    expect(screen.queryByText('Смотреть все темы')).not.toBeInTheDocument();
    expect(screen.queryByText('Активность сигналов')).not.toBeInTheDocument();
    expect(screen.queryByText('Раньше круга')).not.toBeInTheDocument();
  });

  it('share button works and Add signal CTA goes to /contribute', async () => {
    installMatchMedia(false);
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { share, clipboard: undefined });
    const u = userEvent.setup();
    renderAt('/wrapped');
    expect(screen.getByRole('link', { name: 'Добавить сигнал' })).toHaveAttribute('href', '/contribute');
    await u.click(screen.getByRole('button', { name: /Поделиться/ }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringMatching(/Мой/) }))); 
    expect(await screen.findByText('Отчёт скопирован')).toBeInTheDocument();
  });

  it('/curator/overview renders in demo and /lab/wrapped-reference-v2 remains available', () => {
    renderAt('/curator/overview');
    expect(screen.getByRole('heading', { name: /Сводка круга/ })).toBeInTheDocument();
    cleanup();
    renderAt('/lab/wrapped-reference-v2');
    expect(document.body.textContent).toMatch(/Wrapped|УЗОР/i);
  });
});

describe('delta create lab route', () => {
  it('показывает заголовок, бейдж, четыре шага и не показывает старые preset-кнопки', () => {
    renderAt('/lab/delta-create-core');
    expect(screen.getByRole('heading', { name: 'Что изменилось рядом с вами?' })).toBeInTheDocument();
    expect(screen.getByText('Лаборатория · этап 3.1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Место' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Изменение' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Контекст' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Проверка' })).toBeInTheDocument();
    expect(screen.queryByText('Что ты сейчас узнаёшь?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Дольше ждать транспорт' })).not.toBeInTheDocument();
  });

  it('позволяет пройти четыре шага, редактировать statement и показать summary без Supabase', async () => {
    const u = userEvent.setup();
    renderAt('/lab/delta-create-core');
    await u.click(screen.getByRole('button', { name: 'Ленинский район' }));
    expect(screen.getByRole('button', { name: 'Далее' })).toBeEnabled();
    await u.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByText('Изменение облегчило, ускорило или улучшило ситуацию.')).toBeInTheDocument();
    expect(screen.getByText('Изменение усложнило, замедлило или ухудшило ситуацию.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Стало лучше/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Стало хуже/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Транспорт и дорога/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Доступность услуг/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Городская среда/ })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Стало лучше/ }));
    expect(screen.getByRole('button', { name: 'Стало быстрее' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Стало хуже/ }));
    expect(screen.getByRole('button', { name: 'Стало медленнее' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Транспорт и дорога/ }));
    await u.click(screen.getByRole('button', { name: 'Стало медленнее' }));
    await u.type(screen.getByLabelText('Что именно изменилось?'), 'ожидание автобуса вечером');
    expect(screen.getByText('Ожидание автобуса вечером стало дольше')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Уточнить формулировку' }));
    await u.clear(screen.getByLabelText('Формулировка Дельты'));
    await u.type(screen.getByLabelText('Формулировка Дельты'), 'Ожидание автобуса стало заметно дольше');
    expect(screen.getByRole('button', { name: 'Вернуть автоматическую формулировку' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Заметно' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Сегодня' }));
    await u.click(screen.getByRole('button', { name: 'Заметно' }));
    await u.type(screen.getByLabelText('Что именно вы заметили?'), 'Автобус приходит реже вечером.');
    await u.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByRole('heading', { name: 'Проверьте Дельту' })).toBeInTheDocument();
    expect(screen.getByText('Ожидание автобуса стало заметно дольше')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Черновик готов' }));
    expect(screen.getByRole('heading', { name: 'Черновик Дельты готов' })).toBeInTheDocument();
    expect(screen.queryByText(/Нужна настройка Supabase|Код приглашения/)).not.toBeInTheDocument();
  }, 10000);

  it('показывает restore prompt при draft и безопасно игнорирует damaged draft', () => {
    localStorage.setItem('uzor_delta_create_core_v1', JSON.stringify({ currentStep: 2, districtCode: 'leninsky', districtLabel: 'Ленинский район', locationHint: '', direction: '', categorySlug: '', changeType: '', subject: '', statement: '', statementMode: 'auto', observedWindow: '', impactLevel: '', details: '' }));
    const first = renderAt('/lab/delta-create-core');
    expect(screen.getByText('У вас есть незавершённая Дельта')).toBeInTheDocument();
    first.unmount(); cleanup(); localStorage.setItem('uzor_delta_create_core_v1', '{bad');
    renderAt('/lab/delta-create-core');
    expect(screen.getByRole('heading', { name: 'Что изменилось рядом с вами?' })).toBeInTheDocument();
  });

  it('production /contribute, /map и /wrapped продолжают открываться', async () => {
    renderAt('/contribute');
    expect(screen.getByRole('heading', { name: 'Что изменилось рядом с вами?' })).toBeInTheDocument();
    cleanup();
    renderAt('/wrapped');
    expect(screen.getByRole('heading', { name: 'Личный Wrapped реальности' })).toBeInTheDocument();
    cleanup();
    renderAt('/map');
    expect(await screen.findByRole('heading', { name: 'Дельты Перми' })).toBeInTheDocument();
  });
  it('/lab/delta-create-geo открывается в demo и без выбранной точки блокирует шаг места', () => {
    renderAt('/lab/delta-create-geo');
    expect(screen.getByText('Лаборатория · этап 3.2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Где это изменилось?' })).toBeInTheDocument();
    expect(screen.getByText('Демо-режим · быстрый выбор учебной точки')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Далее' })).toBeDisabled();
  });

  it('/lab/delta-create-core продолжает открываться после добавления geo route', () => {
    renderAt('/lab/delta-create-core');
    expect(screen.getByText('Лаборатория · этап 3.1')).toBeInTheDocument();
  });

  it('production /contribute заменён geo-конструктором', () => {
    renderAt('/contribute');
    expect(screen.getByRole('heading', { name: 'Что изменилось рядом с вами?' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Что ты сейчас узнаёшь?' })).not.toBeInTheDocument();
    expect(screen.queryByText('Лаборатория · этап 3.2')).not.toBeInTheDocument();
  });

});

describe('ProductShell shared navigation routes', () => {
  it('keeps separate desktop and mobile navigation models', async () => {
    installMatchMedia(false);
    const view = renderAt('/wrapped');

    expect(screen.getByRole('complementary', { name: 'Основная навигация' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Мобильная навигация' })).not.toBeInTheDocument();

    const desktopNav = screen.getByRole('complementary', { name: 'Основная навигация' });
    expect(desktopNav).toHaveTextContent('Wrapped');
    expect(desktopNav).toHaveTextContent('Карта дельт');
    expect(desktopNav).toHaveTextContent('Добавить Дельту');

    view.unmount();

    installMatchMedia(true);
    const mobileView = renderAt('/pulse');
    expect(screen.queryByRole('complementary', { name: 'Основная навигация' })).not.toBeInTheDocument();
    const mobileNav = screen.getByRole('navigation', { name: 'Мобильная навигация' });
    expect(Array.from(mobileNav.querySelectorAll('a')).map((link) => link.textContent)).toEqual(['Пульс', 'Добавить', 'Карта']);
    expect(mobileNav.querySelectorAll('a')[1]).toHaveAttribute('href', '/contribute');
    expect(mobileNav.querySelectorAll('a')[1]).toHaveClass('mobile-app-dock__primary');
    mobileView.unmount();
  });

  it.each([
    ['/pulse', 'Пульс'],
    ['/wrapped', 'Пульс'],
    ['/contribute', 'Добавить'],
    ['/map', 'Карта'],
  ] as const)('marks %s active in the mobile navigation', async (route, activeLabel) => {
    installMatchMedia(true);
    const view = renderAt(route);
    const mobileNav = screen.getByRole('navigation', { name: 'Мобильная навигация' });
    expect(within(mobileNav).getByRole('link', { name: activeLabel })).toHaveAttribute('aria-current', 'page');
    view.unmount();
  });
});
