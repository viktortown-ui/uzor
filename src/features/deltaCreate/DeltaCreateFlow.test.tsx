import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductShell } from '../../app/ProductShell';
import { isWithinPermMvpArea } from './deltaGeoLogic';
import { shareDeltaPayload } from './deltaCreateProductionLogic';

function ShellAt({ route }: { route: string }) {
  return <MemoryRouter initialEntries={[route]}><ProductShell><h1>Page</h1></ProductShell></MemoryRouter>;
}

function installMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({
    media: query, matches: query === '(max-width: 900px)' ? matches : false, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) });
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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
