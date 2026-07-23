import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRegister = vi.hoisted(() => ({ calls: [] as unknown[], updater: vi.fn(async () => undefined), options: undefined as undefined | Record<string, unknown> }));
vi.mock('virtual:pwa-register', () => ({ registerSW: (options: Record<string, unknown>) => { mockRegister.calls.push(options); mockRegister.options = options; return mockRegister.updater; } }));

class WorkerTarget extends EventTarget { state = 'installing'; scriptURL = '/uzor/sw.js'; setState(state: string) { this.state = state; this.dispatchEvent(new Event('statechange')); } }
class RegistrationTarget extends EventTarget { scope = 'http://localhost/uzor/'; active: WorkerTarget | null = null; waiting: WorkerTarget | null = null; installing: WorkerTarget | null = null; }

beforeEach(() => { vi.resetModules(); mockRegister.calls = []; mockRegister.options = undefined; mockRegister.updater.mockClear(); Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: new EventTarget() }); });
afterEach(() => { vi.restoreAllMocks(); });

describe('pwaServiceWorkerRegistration', () => {
  it('registers immediately exactly once', async () => { const runtime = await import('./pwaServiceWorkerRegistration'); runtime.startPwaServiceWorkerRegistration(); runtime.startPwaServiceWorkerRegistration(); expect(mockRegister.calls).toHaveLength(1); expect(mockRegister.options?.immediate).toBe(true); });
  it('sanitizes errors, tracks offline-ready, waiting updates, workers, controllerchange, acceptance and dismissal without clearing storage', async () => {
    const runtime = await import('./pwaServiceWorkerRegistration');
    const registration = new RegistrationTarget(); const installing = new WorkerTarget(); registration.installing = installing;
    (mockRegister.options?.onRegisteredSW as (url: string, registration: ServiceWorkerRegistration) => void)('/uzor/sw.js', registration as unknown as ServiceWorkerRegistration);
    expect(runtime.getPwaRuntimeSnapshot().installingState).toBe('installing');
    installing.setState('installed'); expect(runtime.getPwaRuntimeSnapshot().installingState).toBe('installed');
    const waiting = new WorkerTarget(); waiting.state = 'installed'; registration.waiting = waiting; registration.dispatchEvent(new Event('updatefound'));
    (mockRegister.options?.onNeedRefresh as () => void)(); expect(runtime.getPwaRuntimeSnapshot().needRefresh).toBe(true); expect(runtime.getPwaRuntimeSnapshot().waitingState).toBe('installed');
    (mockRegister.options?.onOfflineReady as () => void)(); expect(runtime.getPwaRuntimeSnapshot().offlineReady).toBe(true);
    (mockRegister.options?.onRegisterError as (error: unknown) => void)(new Error('x'.repeat(400))); expect(runtime.getPwaRuntimeSnapshot().registrationError?.length).toBe(240);
    const clear = vi.spyOn(Storage.prototype, 'clear'); const remove = vi.spyOn(Storage.prototype, 'removeItem');
    await runtime.applyPwaUpdate(true); expect(mockRegister.updater).toHaveBeenCalledWith(true); expect(clear).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
    runtime.dismissPwaUpdate(); expect(runtime.getPwaRuntimeSnapshot().needRefresh).toBe(false);
    navigator.serviceWorker?.dispatchEvent(new Event('controllerchange'));
  });
});
