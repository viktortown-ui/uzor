import { registerSW } from 'virtual:pwa-register';

type RuntimeState = { needRefresh: boolean; offlineReady: boolean; swUrl: string | null; registrationScope: string | null; activeState: string | null; waitingState: string | null; installingState: string | null; controllingScriptURL: string | null; registrationError: string | null };
type Listener = () => void;
const listeners = new Set<Listener>();
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registrationRef: ServiceWorkerRegistration | undefined;
let started = false;
let state: RuntimeState = { needRefresh: false, offlineReady: false, swUrl: null, registrationScope: null, activeState: null, waitingState: null, installingState: null, controllingScriptURL: null, registrationError: null };

function sanitize(error: unknown) { return error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240); }
function emit() { listeners.forEach((listener) => listener()); }
function snapshotWorker(registration = registrationRef) { state = { ...state, registrationScope: registration?.scope ?? state.registrationScope, activeState: registration?.active?.state ?? null, waitingState: registration?.waiting?.state ?? null, installingState: registration?.installing?.state ?? null, controllingScriptURL: navigator.serviceWorker?.controller?.scriptURL ?? null }; }
function watchWorker(worker?: ServiceWorker | null) { worker?.addEventListener?.('statechange', () => { snapshotWorker(); emit(); }); }
function attachRegistration(registration?: ServiceWorkerRegistration) {
  registrationRef = registration;
  if (!registration) return;
  snapshotWorker(registration);
  watchWorker(registration.installing);
  watchWorker(registration.waiting);
  watchWorker(registration.active);
  registration.addEventListener?.('updatefound', () => { watchWorker(registration.installing); snapshotWorker(registration); emit(); });
}
export function startPwaServiceWorkerRegistration() {
  if (started || typeof window === 'undefined') return;
  started = true;
  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) { state = { ...state, swUrl, registrationError: null }; attachRegistration(registration); emit(); },
    onRegisterError(error) { state = { ...state, registrationError: sanitize(error) }; emit(); },
    onOfflineReady() { state = { ...state, offlineReady: true }; snapshotWorker(); emit(); },
    onNeedRefresh() { state = { ...state, needRefresh: true }; snapshotWorker(); emit(); },
  });
  navigator.serviceWorker?.addEventListener?.('controllerchange', () => { snapshotWorker(); emit(); });
}
export function subscribePwaRuntime(listener: Listener) { startPwaServiceWorkerRegistration(); listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getPwaRuntimeSnapshot() { return state; }
export async function applyPwaUpdate(reloadPage = true) { await updateServiceWorker?.(reloadPage); state = { ...state, needRefresh: false }; snapshotWorker(); emit(); }
export function dismissPwaUpdate() { state = { ...state, needRefresh: false }; emit(); }
export function resetPwaRuntimeForTests() { listeners.clear(); updateServiceWorker = null; registrationRef = undefined; started = false; state = { needRefresh: false, offlineReady: false, swUrl: null, registrationScope: null, activeState: null, waitingState: null, installingState: null, controllingScriptURL: null, registrationError: null }; }

startPwaServiceWorkerRegistration();
