import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProductShell } from '../../app/ProductShell';
import { isWithinPermMvpArea } from './deltaGeoLogic';
import { shareDeltaPayload } from './deltaCreateProductionLogic';
import { DeltaCreatePage } from './DeltaCreatePage';

function ShellAt({ route }: { route: string }) {
  return <MemoryRouter initialEntries={[route]}><ProductShell><h1>Page</h1></ProductShell></MemoryRouter>;
}

function installMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({
    media: query, matches: query === '(max-width: 900px)' ? matches : false, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) });
}

afterEach(() => { cleanup(); localStorage.removeItem('uzor_delta_create_v1'); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Delta production shell safeguards', () => {
  it('shows shared navigation on /contribute with brand and active item', () => {
    render(<ShellAt route="/contribute" />);
    expect(screen.getAllByText('УЗОР')[0].closest('a')).toHaveAttribute('href', '/wrapped');
    expect(screen.getAllByText('Итог недели').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Карта дельт').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Добавить Дельту').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Добавить Дельту')[0].closest('a')).toHaveAttribute('aria-current', 'page');
  });
  it('marks map and wrapped active routes from useLocation', () => {
    render(<ShellAt route="/map" />);
    expect(screen.getAllByText('Карта дельт').find((el) => el.closest('a')?.getAttribute('aria-current') === 'page')).toBeTruthy();
    cleanup();
    render(<ShellAt route="/wrapped" />);
    expect(screen.getAllByText('Итог недели').find((el) => el.closest('a')?.getAttribute('aria-current') === 'page')).toBeTruthy();
  });
  it('keeps mobile navigation labels available', () => {
    installMatchMedia(true);
    const view = render(<ShellAt route="/contribute" />);
    const mobileNav = view.container.querySelector('.mobile-app-dock');
    expect(mobileNav).toHaveAttribute('aria-label', 'Мобильная навигация');
    expect(within(mobileNav as HTMLElement).getByRole('link', { name: 'Добавить', hidden: true })).toHaveAttribute('aria-current', 'page');
  });
  it('accepts Perm points and rejects outside-Perm points', () => {
    expect(isWithinPermMvpArea(58.0105, 56.2502)).toBe(true);
    expect(isWithinPermMvpArea(55.7558, 37.6173)).toBe(false);
  });
  it('falls back from non-abort native share errors to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const nav = { share: vi.fn().mockRejectedValue(new Error('nope')), clipboard: { writeText } } as unknown as Navigator;
    await expect(shareDeltaPayload({ title: 't', text: 'x', url: 'https://u.test' }, nav)).resolves.toBe('Ссылка на Дельту скопирована');
    expect(writeText).toHaveBeenCalledOnce();
  });
});

describe('responsive Delta creation route', () => {
  it('renders the complete desktop workspace above the mobile breakpoint', () => {
    installMatchMedia(false);
    const view = render(<MemoryRouter><DeltaCreatePage /></MemoryRouter>);

    expect(view.container.querySelector('.delta-create-lab')).toBeInTheDocument();
    const progress = screen.getByRole('navigation', { name: 'Шаги конструктора' });
    for (const label of ['Место', 'Изменение', 'Контекст', 'Проверка']) {
      expect(within(progress).getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('application', { name: 'Карта выбора места' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Моё местоположение' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Уточните район' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Уточнение места' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Назад' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Далее' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Начать заново' })).toHaveLength(1);
    const actions = view.container.querySelector('.delta-create-actions');
    expect(Array.from(actions?.querySelectorAll('button') ?? []).map((button) => button.textContent)).toEqual(['Назад', 'Начать заново', 'Далее']);
    expect(screen.getByRole('button', { name: 'Далее' })).toBeDisabled();
  });

  it('scopes native select color corrections to Delta creation', async () => {
    const css = await import('./deltaCreate.css?raw').then((module) => module.default as string);
    expect(css).toContain('.delta-create-lab select,.delta-create-lab select:hover,.delta-create-lab select:focus');
    expect(css).not.toMatch(/(?:^|\})\s*select,select:hover,select:focus/);
  });

  it('keeps rendering the dedicated mobile flow at the breakpoint', () => {
    installMatchMedia(true);
    const view = render(<MemoryRouter><DeltaCreatePage /></MemoryRouter>);

    expect(view.container.querySelector('.mobile-delta-flow')).toBeInTheDocument();
    expect(view.container.querySelector('.delta-create-lab')).not.toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('keeps the final publication action in the stable step-4 action row', async () => {
    installMatchMedia(false);
    localStorage.setItem('uzor_delta_create_v1', JSON.stringify({ currentStep:4,districtCode:'leninsky',districtLabel:'Ленинский район',locationHint:'',lat:58.01,lng:56.25,locationLabel:'Пермь',locationPrecision:'point',locationSource:'map',selectedSimilarDeltaId:null,similarDecision:'separate',direction:'negative',categorySlug:'transport',changeType:'slower',subject:'Ожидание автобуса',statement:'Ожидание автобуса — Стало медленнее.',statementMode:'auto',observedWindow:'today',impactLevel:'noticeable',details:'' }));
    const view=render(<MemoryRouter><DeltaCreatePage /></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button',{name:'Продолжить'}));
    const actions=view.container.querySelector('.delta-create-actions');
    expect(actions).toBeInTheDocument();
    expect(Array.from(actions?.querySelectorAll('button')??[]).map((button)=>button.textContent)).toEqual(['Назад','Начать заново','Опубликовать Дельту']);
    expect(within(actions as HTMLElement).getByRole('button',{name:'Опубликовать Дельту'})).toHaveClass('primary');
  });
});
