import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { getInitialPulseState, TraceContent } from '../features/mobilePulse/MobilePulsePage';
import { wrappedDemoReport } from '../features/wrapped/wrappedDemoData';

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => ({
    media: query,
    get matches() { return query === '(max-width: 900px)' ? matches : false; },
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  })) });
  return { setMatches(next: boolean) { matches = next; listeners.forEach((listener) => listener({ matches, media: '(max-width: 900px)' } as MediaQueryListEvent)); } };
}

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.pushState(null, '', '/'); });

describe('mobile stage 1 shell and routing', () => {
  it('на мобильной ширине рендерит только MobileProductShell без desktop sidebar и с одним main', async () => {
    installMatchMedia(true);
    renderAt('/pulse');
    expect(screen.getByTestId('mobile-product-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-product-shell')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Основная навигация' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Мобильная навигация' })).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('на desktop ширине рендерит только DesktopProductShell без mobile dock', () => {
    installMatchMedia(false);
    renderAt('/wrapped');
    expect(screen.getByTestId('desktop-product-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-product-shell')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Основная навигация' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Мобильная навигация' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('смена matchMedia переключает shell', async () => {
    const media = installMatchMedia(false);
    renderAt('/wrapped');
    expect(screen.getByTestId('desktop-product-shell')).toBeInTheDocument();
    media.setMatches(true);
    await waitFor(() => expect(screen.getByTestId('mobile-product-shell')).toBeInTheDocument());
    expect(screen.queryByTestId('desktop-product-shell')).not.toBeInTheDocument();
  });

  it('root redirect учитывает ширину и HashRouter', async () => {
    installMatchMedia(true);
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Что изменилось рядом' })).toBeInTheDocument();
    cleanup();
    installMatchMedia(false);
    renderAt('/');
    expect(await screen.findByRole('heading', { name: /Личный итог недели|Wrapped/ })).toBeInTheDocument();
    cleanup();
    installMatchMedia(true);
    window.history.pushState(null, '', '/uzor/#/');
    render(<HashRouter><App /></HashRouter>);
    expect(await screen.findByRole('heading', { name: 'Что изменилось рядом' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/pulse');
  });

  it('desktop /pulse redirects to /wrapped, mobile /wrapped remains valid', async () => {
    installMatchMedia(false);
    renderAt('/pulse');
    expect(await screen.findByRole('heading', { name: /Личный итог недели|Wrapped/ })).toBeInTheDocument();
    cleanup();
    installMatchMedia(true);
    renderAt('/wrapped');
    expect(await screen.findByRole('heading', { name: 'Ранний наблюдатель' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Пульс' })).toHaveAttribute('aria-current', 'page');
  });

  it('mobile dock labels and active states are exact', () => {
    installMatchMedia(true);
    render(<MemoryRouter initialEntries={['/pulse']}><App /></MemoryRouter>);
    const dock = screen.getByRole('navigation', { name: 'Мобильная навигация' });
    expect(within(dock).getAllByRole('link').map((link) => link.textContent)).toEqual(['Пульс', 'Добавить', 'Карта']);
    expect(screen.getByRole('link', { name: 'Пульс' })).toHaveAttribute('aria-current', 'page');
    cleanup();
    render(<MemoryRouter initialEntries={['/contribute']}><App /></MemoryRouter>);
    expect(screen.queryByRole('navigation', { name: 'Мобильная навигация' })).not.toBeInTheDocument();
    cleanup();
    render(<MemoryRouter initialEntries={['/map']}><App /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Карта' })).toHaveAttribute('aria-current', 'page');
  });

  it('desktop labels remain unchanged', () => {
    installMatchMedia(false);
    renderAt('/wrapped');
    const nav = screen.getByRole('complementary', { name: 'Основная навигация' });
    expect(within(nav).getAllByRole('link').slice(1).map((link) => link.textContent)).toEqual(['Итог недели', 'Карта дельт', 'Добавить Дельту']);
  });
});

describe('MobilePulsePage', () => {
  it('production without configuration starts in error, never ready demo data', () => {
    expect(getInitialPulseState({ demoMode: false, productionConfigured: false, demoReportEmpty: false })).toBe('error');
    expect(getInitialPulseState({ demoMode: false, productionConfigured: true, demoReportEmpty: false })).toBe('loading');
    expect(getInitialPulseState({ demoMode: true, productionConfigured: false, demoReportEmpty: false })).toBe('ready');
  });

  it('shows Pulse composition and ready Wrapped summary entry', async () => {
    installMatchMedia(true);
    renderAt('/pulse');
    expect(screen.getByRole('heading', { name: 'Что изменилось рядом' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Открыть карту' })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: 'Отметить изменение' })).toHaveAttribute('href', '/contribute');
    expect(screen.getByText('Ваш след за неделю')).toBeInTheDocument();
    expect(screen.getByText('Открыть итог недели')).toHaveAttribute('href', '/wrapped');
    expect(screen.queryByText(/после 3 Дельт/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Статус итога недели')).not.toBeInTheDocument();
    expect(screen.getByText('Добавлено')).toBeInTheDocument();
    expect(screen.getByText('Подтверждено')).toBeInTheDocument();
    expect(screen.getByText('Серия недель')).toBeInTheDocument();
    expect(screen.queryByText('Пока итог недели не собран')).not.toBeInTheDocument();
  });

  it('uses count-independent metric labels for single values', () => {
    const report = {
      ...wrappedDemoReport,
      summary: { ...wrappedDemoReport.summary, signalsThisWeek: 1, confirmedSignals: 1, weekStreak: 1 },
    };
    render(<MemoryRouter><TraceContent state="ready" report={report} /></MemoryRouter>);
    expect(screen.getByText('Добавлено')).toBeInTheDocument();
    expect(screen.getByText('Подтверждено')).toBeInTheDocument();
    expect(screen.getByText('Серия недель')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('1 Дельты');
    expect(document.body.textContent).not.toContain('1 недели');
  });
});
