import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

type Choice = { outcome: 'accepted' | 'dismissed'; platform: string };
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice> };
function emitPrompt() { const event = new Event('beforeinstallprompt') as PromptEvent; event.preventDefault = vi.fn(); event.prompt = vi.fn(async () => undefined); event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' }); window.dispatchEvent(event); return event; }

beforeEach(() => { vi.resetModules(); Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) }); Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 Android Chrome/120 Safari/537.36' }); Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Linux armv8l' }); Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('pwaInstallBridge', () => {
  it('captures an event before React subscribes and consumes it once without a passive emit', async () => { const bridge = await import('./pwaInstallBridge'); const event = emitPrompt(); expect(event.preventDefault).toHaveBeenCalledOnce(); expect(bridge.getPwaInstallBridgeSnapshot().deferredPrompt).toBe(event); const consumed = bridge.consumeDeferredPrompt(); expect(consumed).toBe(event); expect(bridge.consumeDeferredPrompt()).toBeNull(); });
  it('makes a pre-React prompt immediately available to the Provider and launcher', async () => {
    await import('./pwaInstallBridge');
    const event = emitPrompt();
    const { PwaInstallProvider } = await import('./PwaInstallProvider');
    const { PwaInstallLauncher } = await import('./PwaInstallLauncher');
    render(<MemoryRouter initialEntries={['/pulse']}><PwaInstallProvider><PwaInstallLauncher /></PwaInstallProvider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Установить УЗОР' }));
    await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce());
  });
  it('keeps exactly one global listener through Provider mounts and repeated starts', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const bridge = await import('./pwaInstallBridge');
    const before = add.mock.calls.filter(([name]) => name === 'beforeinstallprompt').map((call) => call[1]);
    const installed = add.mock.calls.filter(([name]) => name === 'appinstalled').map((call) => call[1]);
    expect(before).toHaveLength(1); expect(installed).toHaveLength(1);
    const { PwaInstallProvider } = await import('./PwaInstallProvider');
    const view = render(<MemoryRouter initialEntries={['/map']}><PwaInstallProvider><div /></PwaInstallProvider></MemoryRouter>);
    view.rerender(<MemoryRouter initialEntries={['/pulse']}><PwaInstallProvider><div /></PwaInstallProvider></MemoryRouter>);
    view.unmount();
    bridge.ensurePwaInstallBridgeStarted(); bridge.ensurePwaInstallBridgeStarted();
    expect(add.mock.calls.filter(([name]) => name === 'beforeinstallprompt').map((call) => call[1])).toEqual(before);
    expect(add.mock.calls.filter(([name]) => name === 'appinstalled').map((call) => call[1])).toEqual(installed);
  });
});
