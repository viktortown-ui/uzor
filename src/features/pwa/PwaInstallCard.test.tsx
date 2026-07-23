import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProductShell } from '../../app/ProductShell';
import { PwaInstallCard } from './PwaInstallCard';
import { PwaInstallProvider, PWA_PROMOTION_DISMISSED_KEY } from './PwaInstallProvider';
import { getPwaInstallBridgeSnapshot, resetPwaInstallBridgeForTests } from './pwaInstallBridge';
import { PwaInstallLauncher } from './PwaInstallLauncher';

type Choice = { outcome: 'accepted' | 'dismissed'; platform: string };
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice>; rejectChoice?: () => void };
type Mql = { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>; emit: () => void };
const original = { hasMatchMedia: Object.prototype.hasOwnProperty.call(window, 'matchMedia'), matchMedia: window.matchMedia, ua: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints, hasStandalone: Object.prototype.hasOwnProperty.call(navigator, 'standalone'), standalone: (navigator as Navigator & { standalone?: boolean }).standalone, hasIndexedDB: Object.prototype.hasOwnProperty.call(window, 'indexedDB'), indexedDB: window.indexedDB };
let mobileMql: Mql; let standaloneMql: Mql;
function makeMql(matches: boolean): Mql { const listeners: Array<() => void> = []; return { matches, addEventListener: vi.fn((_event: string, cb: () => void) => listeners.push(cb)), removeEventListener: vi.fn(), emit: () => listeners.forEach((cb) => cb()) }; }
function setEnv({ mobile = true, standalone = false, ua = 'Mozilla/5.0 Android Chrome/120 Safari/537.36', platform = 'Linux armv8l', touch = 5, navStandalone }: { mobile?: boolean; standalone?: boolean; ua?: string; platform?: string; touch?: number; navStandalone?: boolean } = {}) {
  mobileMql = makeMql(mobile); standaloneMql = makeMql(standalone);
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn((query: string) => query.includes('standalone') ? standaloneMql : mobileMql) });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ua });
  Object.defineProperty(navigator, 'platform', { configurable: true, value: platform });
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: touch });
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: navStandalone });
}
function renderWithProvider(ui: React.ReactElement, route = '/pulse') { return render(<MemoryRouter initialEntries={[route]}><PwaInstallProvider>{ui}</PwaInstallProvider></MemoryRouter>); }
function renderApp(route = '/pulse') { return render(<MemoryRouter initialEntries={[route]}><PwaInstallProvider><ProductShell><Routes><Route path="/pulse" element={<><PwaInstallCard/><div>pulse</div></>} /><Route path="/map" element={<div>map</div>} /><Route path="/contribute" element={<div className="mobile-delta-create-page">form</div>} /></Routes></ProductShell><PwaInstallLauncher /></PwaInstallProvider></MemoryRouter>); }
function emitPrompt({ outcome = 'accepted', promptReject = false, choiceReject = false, userChoice }: { outcome?: 'accepted' | 'dismissed'; promptReject?: boolean; choiceReject?: boolean; userChoice?: Promise<Choice> } = {}) {
  const event = new Event('beforeinstallprompt') as PromptEvent;
  event.preventDefault = vi.fn();
  event.prompt = vi.fn(() => promptReject ? Promise.reject(new Error('prompt')) : Promise.resolve());
  event.userChoice = userChoice ?? (choiceReject ? new Promise<Choice>((_resolve, reject) => { event.rejectChoice = () => reject(new Error('choice')); }) : Promise.resolve({ outcome, platform: 'web' }));
  fireEvent(window, event);
  return event;
}
beforeEach(() => { resetPwaInstallBridgeForTests(); sessionStorage.removeItem(PWA_PROMOTION_DISMISSED_KEY); localStorage.setItem('delta-draft', 'keep'); setEnv(); });
afterEach(() => { cleanup(); sessionStorage.removeItem(PWA_PROMOTION_DISMISSED_KEY); localStorage.removeItem('delta-draft'); if (original.hasMatchMedia) Object.defineProperty(window, 'matchMedia', { configurable: true, value: original.matchMedia }); else delete (window as unknown as { matchMedia?: unknown }).matchMedia; Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original.ua }); Object.defineProperty(navigator, 'platform', { configurable: true, value: original.platform }); Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: original.maxTouchPoints }); if (original.hasStandalone) Object.defineProperty(navigator, 'standalone', { configurable: true, value: original.standalone }); else delete (navigator as Navigator & { standalone?: unknown }).standalone; if (original.hasIndexedDB) Object.defineProperty(window, 'indexedDB', { configurable: true, value: original.indexedDB }); else delete (window as unknown as { indexedDB?: unknown }).indexedDB; vi.restoreAllMocks(); });

describe('PwaInstallCard', () => {
  it('captures Chromium event and prompts only after a direct click', async () => { renderWithProvider(<PwaInstallCard />); const event = emitPrompt(); expect(event.preventDefault).toHaveBeenCalled(); expect(await screen.findByRole('button', { name: 'Установить' })).toBeInTheDocument(); expect(event.prompt).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Установить' })); await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce()); });
  it('keeps an accepted choice pending until appinstalled confirms installation', async () => { renderApp('/pulse'); emitPrompt({ outcome: 'accepted' }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); expect(await screen.findByText(/Браузер готовит установку/)).toBeInTheDocument(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); fireEvent(window, new Event('appinstalled')); await waitFor(() => expect(screen.queryByLabelText('Установка приложения')).not.toBeInTheDocument()); expect(screen.queryByRole('heading', { name: /Установить|Как установить/ })).not.toBeInTheDocument(); expect(getPwaInstallBridgeSnapshot().installed).toBe(true); });
  it('keeps prompting active while userChoice is unresolved, then pending until appinstalled', async () => {
    let resolveChoice!: (choice: Choice) => void;
    const userChoice = new Promise<Choice>((resolve) => { resolveChoice = resolve; });
    renderApp('/pulse');
    const event = emitPrompt({ userChoice });
    fireEvent.click(await screen.findByRole('button', { name: 'Установить' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Открываем…' })).toHaveLength(2));
    screen.getAllByRole('button', { name: 'Открываем…' }).forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByRole('heading', { name: 'Открываем установку…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Как установить' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Инструкция по установке')).not.toBeInTheDocument();
    expect(event.prompt).toHaveBeenCalledOnce();
    await act(async () => { resolveChoice({ outcome: 'accepted', platform: 'web' }); await userChoice; });
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Устанавливаем…' })).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Устанавливаем…' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Устанавливаем УЗОР…' })).toBeInTheDocument();
    fireEvent(window, new Event('appinstalled'));
    await waitFor(() => expect(screen.queryByLabelText('Установка приложения')).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /Установить|Как установить|Открываем|Устанавливаем/ })).not.toBeInTheDocument();
  });
  it('hides only the promotion after dismissed userChoice', async () => { renderApp('/pulse'); const event = emitPrompt({ outcome: 'dismissed' }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); await waitFor(() => expect(sessionStorage.getItem(PWA_PROMOTION_DISMISSED_KEY)).toBe('1')); expect(screen.queryByRole('heading', { name: 'Установить УЗОР' })).not.toBeInTheDocument(); expect(screen.getAllByRole('button', { name: 'Как установить' }).length).toBeGreaterThanOrEqual(1); fireEvent.click(screen.getAllByRole('button', { name: 'Как установить' }).at(-1)!); expect(screen.getByText(/Откройте меню браузера/)).toBeInTheDocument(); expect(event.prompt).toHaveBeenCalledOnce(); });
  it('handles rejected prompt and rejected userChoice without clearing drafts', async () => { renderWithProvider(<PwaInstallCard />); emitPrompt({ promptReject: true }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); expect(await screen.findByText(/Не удалось открыть установку/)).toBeInTheDocument(); cleanup(); renderWithProvider(<PwaInstallCard />); const rejectedChoice = emitPrompt({ choiceReject: true }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); rejectedChoice.rejectChoice?.(); expect(await screen.findByText(/Не удалось открыть установку/)).toBeInTheDocument(); expect(localStorage.getItem('delta-draft')).toBe('keep'); });
  it('hides for initial standalone, media-query standalone changes, and navigator.standalone', async () => { setEnv({ standalone: true }); renderWithProvider(<PwaInstallCard />); expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument(); cleanup(); setEnv({ navStandalone: true }); renderWithProvider(<PwaInstallCard />); expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument(); cleanup(); setEnv(); resetPwaInstallBridgeForTests(); renderWithProvider(<PwaInstallCard />); expect(screen.getByText('Как установить УЗОР')).toBeInTheDocument(); act(() => { standaloneMql.matches = true; standaloneMql.emit(); }); await waitFor(() => expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument()); });
  it.each([
    ['iPhone Safari', 'Mozilla/5.0 (iPhone) Version/17.0 Mobile/15E148 Safari/604.1', 'iPhone', 1],
    ['classic iPad Safari', 'Mozilla/5.0 (iPad) Version/17.0 Mobile/15E148 Safari/604.1', 'iPad', 5],
    ['modern iPadOS Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/17.0 Safari/605.1.15', 'MacIntel', 5],
  ])('shows manual instructions for %s after an explicit click', (_label, ua, platform, touch) => { setEnv({ ua, platform, touch }); renderWithProvider(<PwaInstallCard />); expect(screen.queryByText('Нажмите «Поделиться».')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Как установить' })); expect(screen.getByText('Нажмите «Поделиться».')).toBeInTheDocument(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); });
  it.each([
    ['CriOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0 Mobile/15E148 Safari/604.1'],
    ['EdgiOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) EdgiOS/120.0 Mobile/15E148 Safari/604.1'],
    ['FxiOS', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) FxiOS/120.0 Mobile/15E148 Safari/604.1'],
  ])('tells %s users to open Safari instead of claiming native or generic Chrome install', (_family, ua) => {
    setEnv({ ua, platform: 'iPhone', touch: 1 });
    renderWithProvider(<PwaInstallCard />);
    expect(screen.queryByRole('button', { name: 'Установить' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Как установить УЗОР' })).toBeInTheDocument();
    expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Как установить' }));
    expect(screen.getByText(/Откройте эту страницу в Safari/)).toBeInTheDocument();
    expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument();
  });
  it('keeps unsupported mobile fallback collapsed until Как установить', () => { renderWithProvider(<PwaInstallCard />); expect(screen.getByText('Как установить УЗОР')).toBeInTheDocument(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Как установить' })); expect(screen.getByText(/Откройте меню браузера/)).toBeInTheDocument(); });
  it('does not show generic fallback on desktop without a prompt but shows a genuine prompt', async () => { setEnv({ mobile: false }); renderWithProvider(<PwaInstallCard />); expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument(); const event = emitPrompt(); expect(await screen.findByRole('button', { name: 'Установить' })).toBeInTheDocument(); expect(event.preventDefault).toHaveBeenCalled(); });

  it.each(['/map', '/contribute'])('captures beforeinstallprompt on direct %s entry', async (route) => { renderApp(route); const event = emitPrompt(); expect(event.preventDefault).toHaveBeenCalled(); expect(await screen.findByRole('button', { name: 'Установить УЗОР' })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Установить УЗОР' })); await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce()); });
  it('preserves the deferred prompt while navigating between map and pulse', async () => { render(<MemoryRouter initialEntries={['/map']}><PwaInstallProvider><ProductShell><Routes><Route path="/map" element={<Link to="/pulse">go pulse</Link>} /><Route path="/pulse" element={<PwaInstallCard />} /></Routes></ProductShell><PwaInstallLauncher /></PwaInstallProvider></MemoryRouter>); const event = emitPrompt(); fireEvent.click(screen.getByText('go pulse')); expect(await screen.findByRole('button', { name: 'Установить' })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Установить' })); await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce()); });
  it('renders ProductShell without a PWA provider', () => { render(<MemoryRouter initialEntries={["/map"]}><ProductShell><div>shell child</div></ProductShell></MemoryRouter>); expect(screen.getByText('shell child')).toBeInTheDocument(); });
  it('opens global manual instructions when no Chromium event exists', () => { renderApp('/map'); fireEvent.click(screen.getByRole('button', { name: 'Как установить' })); expect(screen.getByText(/Откройте меню браузера/)).toBeInTheDocument(); });
  it('prevents repeated installation while pending', async () => { renderApp('/map'); const event = emitPrompt({ outcome: 'accepted' }); fireEvent.click(await screen.findByRole('button', { name: 'Установить УЗОР' })); const pendingButton = await screen.findByRole('button', { name: 'Устанавливаем…' }); expect(pendingButton).toBeDisabled(); fireEvent.click(pendingButton); expect(event.prompt).toHaveBeenCalledOnce(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); });
  it('opens iOS global instructions only after click and closes them', () => { setEnv({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/17.0 Safari/605.1.15', platform: 'MacIntel', touch: 5 }); renderApp('/map'); expect(screen.queryByText('Нажмите «Поделиться».')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Как установить' })); expect(screen.getByText('Нажмите «Поделиться».')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Понятно' })); expect(screen.queryByText('Нажмите «Поделиться».')).not.toBeInTheDocument(); });
  it('keeps the global launcher after promotion dismissal without clearing localStorage or IndexedDB', async () => { const db = { marker: 'keep' } as unknown as IDBFactory; Object.defineProperty(window, 'indexedDB', { configurable: true, value: db }); renderApp('/pulse'); fireEvent.click(screen.getByRole('button', { name: 'Не сейчас' })); await waitFor(() => expect(screen.queryByRole('heading', { name: 'Установить УЗОР' })).not.toBeInTheDocument()); expect(screen.getByRole('button', { name: 'Как установить' })).toBeInTheDocument(); expect(localStorage.getItem('delta-draft')).toBe('keep'); expect(window.indexedDB).toBe(db); });
});
