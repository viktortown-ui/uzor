import { registerSW } from 'virtual:pwa-register';

type RuntimeState = { needRefresh: boolean; offlineReady: boolean; swUrl: string | null; registrationScope: string | null; activeState: string | null; waitingState: string | null; installingState: string | null; controllingScriptURL: string | null; registrationError: string | null };
type Listener = () => void;
const listeners = new Set<Listener>();
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let started = false;
let state: RuntimeState = { needRefresh: false, offlineReady: false, swUrl: null, registrationScope: null, activeState: null, waitingState: null, installingState: null, controllingScriptURL: null, registrationError: null };

function sanitize(error: unknown) { return error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240); }
function snapshotWorker(registration?: ServiceWorkerRegistration | null) { state = { ...state, registrationScope: registration?.scope ?? state.registrationScope, activeState: registration?.active?.state ?? null, waitingState: registration?.waiting?.state ?? null, installingState: registration?.installing?.state ?? null, controllingScriptURL: navigator.serviceWorker?.controller?.scriptURL ?? null }; }
function emit() { listeners.forEach((listener) => listener()); }
export function startPwaServiceWorkerRegistration() {
  if (started || typeof window === 'undefined') return;
  started = true;
  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) { state = { ...state, swUrl, registrationError: null }; snapshotWorker(registration); emit(); },
    onRegisterError(error) { state = { ...state, registrationError: sanitize(error) }; emit(); },
    onOfflineReady() { state = { ...state, offlineReady: true }; emit(); },
    onNeedRefresh() { state = { ...state, needRefresh: true }; emit(); },
  });
  navigator.serviceWorker?.addEventListener?.('controllerchange', () => { snapshotWorker(null); emit(); });
}
export function subscribePwaRuntime(listener: Listener) { startPwaServiceWorkerRegistration(); listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getPwaRuntimeSnapshot() { return state; }
export async function applyPwaUpdate(reloadPage = true) { await updateServiceWorker?.(reloadPage); state = { ...state, needRefresh: false }; emit(); }
export function dismissPwaUpdate() { state = { ...state, needRefresh: false }; emit(); }

startPwaServiceWorkerRegistration();
