import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Choice = { outcome: 'accepted' | 'dismissed'; platform: string };
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<Choice> };
function emitPrompt() { const event = new Event('beforeinstallprompt') as PromptEvent; event.preventDefault = vi.fn(); event.prompt = vi.fn(async () => undefined); event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' }); window.dispatchEvent(event); return event; }

beforeEach(() => { vi.resetModules(); Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) }); Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 Android Chrome/120 Safari/537.36' }); Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Linux armv8l' }); Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 }); });
afterEach(() => { vi.restoreAllMocks(); });

describe('pwaInstallBridge', () => {
  it('captures an event before React subscribes and consumes it once', async () => {
    const bridge = await import('./pwaInstallBridge');
    const event = emitPrompt();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(bridge.getPwaInstallBridgeSnapshot().deferredPrompt).toBe(event);
    const consumed = bridge.consumeDeferredPrompt();
    expect(consumed).toBe(event);
    expect(bridge.consumeDeferredPrompt()).toBeNull();
  });

  it('does not register duplicate listeners after repeated starts', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const bridge = await import('./pwaInstallBridge');
    bridge.ensurePwaInstallBridgeStarted();
    bridge.ensurePwaInstallBridgeStarted();
    expect(add.mock.calls.filter(([name]) => name === 'beforeinstallprompt')).toHaveLength(1);
    expect(add.mock.calls.filter(([name]) => name === 'appinstalled')).toHaveLength(1);
  });
});
