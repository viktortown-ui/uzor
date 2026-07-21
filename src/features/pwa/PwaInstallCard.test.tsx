import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallCard } from './PwaInstallCard';

type Choice = { outcome: 'accepted' | 'dismissed'; platform: string };
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice>; rejectChoice?: () => void };
type Mql = { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>; emit: () => void };
const original = { matchMedia: window.matchMedia, ua: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints, standalone: (navigator as Navigator & { standalone?: boolean }).standalone, indexedDB: window.indexedDB };
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
function emitPrompt({ outcome = 'accepted', promptReject = false, choiceReject = false }: { outcome?: 'accepted' | 'dismissed'; promptReject?: boolean; choiceReject?: boolean } = {}) {
  const event = new Event('beforeinstallprompt') as PromptEvent;
  event.preventDefault = vi.fn();
  event.prompt = vi.fn(() => promptReject ? Promise.reject(new Error('prompt')) : Promise.resolve());
  event.userChoice = choiceReject ? new Promise<Choice>((_resolve, reject) => { event.rejectChoice = () => reject(new Error('choice')); }) : Promise.resolve({ outcome, platform: 'web' });
  fireEvent(window, event);
  return event;
}
beforeEach(() => { sessionStorage.removeItem('uzor:pwa-install-dismissed'); localStorage.setItem('delta-draft', 'keep'); setEnv(); });
afterEach(() => { cleanup(); sessionStorage.removeItem('uzor:pwa-install-dismissed'); localStorage.removeItem('delta-draft'); Object.defineProperty(window, 'matchMedia', { configurable: true, value: original.matchMedia }); Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original.ua }); Object.defineProperty(navigator, 'platform', { configurable: true, value: original.platform }); Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: original.maxTouchPoints }); Object.defineProperty(navigator, 'standalone', { configurable: true, value: original.standalone }); Object.defineProperty(window, 'indexedDB', { configurable: true, value: original.indexedDB }); vi.clearAllMocks(); });

describe('PwaInstallCard', () => {
  it('captures Chromium event and prompts only after a direct click', async () => { render(<PwaInstallCard />); const event = emitPrompt(); expect(event.preventDefault).toHaveBeenCalled(); expect(await screen.findByRole('button', { name: 'Установить' })).toBeInTheDocument(); expect(event.prompt).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Установить' })); await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce()); });
  it('keeps an accepted choice pending until appinstalled confirms installation', async () => { render(<PwaInstallCard />); emitPrompt({ outcome: 'accepted' }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); expect(await screen.findByText(/Браузер готовит установку/)).toBeInTheDocument(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); fireEvent(window, new Event('appinstalled')); await waitFor(() => expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument()); });
  it('suppresses the card for this session after dismissed userChoice', async () => { render(<PwaInstallCard />); emitPrompt({ outcome: 'dismissed' }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); await waitFor(() => expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument()); expect(sessionStorage.getItem('uzor:pwa-install-dismissed')).toBe('1'); });
  it('handles rejected prompt and rejected userChoice without clearing drafts', async () => { render(<PwaInstallCard />); emitPrompt({ promptReject: true }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); expect(await screen.findByText(/Не удалось открыть установку/)).toBeInTheDocument(); cleanup(); render(<PwaInstallCard />); const rejectedChoice = emitPrompt({ choiceReject: true }); fireEvent.click(await screen.findByRole('button', { name: 'Установить' })); rejectedChoice.rejectChoice?.(); expect(await screen.findByText(/Не удалось открыть установку/)).toBeInTheDocument(); expect(localStorage.getItem('delta-draft')).toBe('keep'); });
  it('hides for initial standalone, media-query standalone changes, and navigator.standalone', async () => { setEnv({ standalone: true }); render(<PwaInstallCard />); expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument(); cleanup(); setEnv({ navStandalone: true }); render(<PwaInstallCard />); expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument(); cleanup(); setEnv(); render(<PwaInstallCard />); expect(screen.getByText('Установить УЗОР')).toBeInTheDocument(); act(() => { standaloneMql.matches = true; standaloneMql.emit(); }); await waitFor(() => expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument()); });
  it.each([
    ['iPhone Safari', 'Mozilla/5.0 (iPhone) Version/17.0 Mobile/15E148 Safari/604.1', 'iPhone', 1],
    ['classic iPad Safari', 'Mozilla/5.0 (iPad) Version/17.0 Mobile/15E148 Safari/604.1', 'iPad', 5],
    ['modern iPadOS Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/17.0 Safari/605.1.15', 'MacIntel', 5],
  ])('shows manual instructions for %s', (_label, ua, platform, touch) => { setEnv({ ua, platform, touch }); render(<PwaInstallCard />); expect(screen.getByText('Нажмите «Поделиться».')).toBeInTheDocument(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); });
  it('keeps unsupported mobile fallback collapsed until Как установить', () => { render(<PwaInstallCard />); expect(screen.getByText('Установить УЗОР')).toBeInTheDocument(); expect(screen.queryByText(/Откройте меню браузера/)).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Как установить' })); expect(screen.getByText(/Откройте меню браузера/)).toBeInTheDocument(); });
  it('does not show generic fallback on desktop without a prompt but shows a genuine prompt', async () => { setEnv({ mobile: false }); render(<PwaInstallCard />); expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument(); const event = emitPrompt(); expect(await screen.findByRole('button', { name: 'Установить' })).toBeInTheDocument(); expect(event.preventDefault).toHaveBeenCalled(); });
  it('uses session dismissal without clearing localStorage or IndexedDB', async () => { const db = { marker: 'keep' } as unknown as IDBFactory; Object.defineProperty(window, 'indexedDB', { configurable: true, value: db }); render(<PwaInstallCard />); fireEvent.click(screen.getByRole('button', { name: 'Не сейчас' })); await waitFor(() => expect(screen.queryByText('Установить УЗОР')).not.toBeInTheDocument()); expect(localStorage.getItem('delta-draft')).toBe('keep'); expect(window.indexedDB).toBe(db); });
});
