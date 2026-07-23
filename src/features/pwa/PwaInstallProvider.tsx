import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { consumeDeferredPrompt, detectBrowserFamily, getPwaInstallBridgeSnapshot, isEmbeddedBrowser, isStandalonePwa, subscribePwaInstallBridge, supportsIosManualInstall } from './pwaInstallBridge';
import type { BeforeInstallPromptChoice, BeforeInstallPromptEvent, BrowserFamily } from './pwaInstallBridge';
import { getPwaRuntimeSnapshot, subscribePwaRuntime } from './pwaServiceWorkerRegistration';

export type { BeforeInstallPromptChoice, BeforeInstallPromptEvent };
export type PwaInstallState = 'waiting' | 'eligible' | 'manual' | 'ios' | 'embedded' | 'prompting' | 'pending' | 'installed' | 'error';
export const PWA_PROMOTION_DISMISSED_KEY = 'uzor:pwa-promotion-dismissed';

type ManifestIconDiagnostic = { src: string; sizes?: string; type?: string; purpose?: string; ok?: boolean; status?: number; error?: string };
type PwaDiagnostics = {
  url: string; pathname: string; hashRoute: string; userAgent: string; browserFamily: BrowserFamily; embedded: boolean; secureContext: boolean; standalone: boolean;
  manifestUrl: string | null; manifestFetch: 'idle' | 'ok' | 'error'; manifestError: string | null; manifestId: string | null; startUrl: string | null; scope: string | null; icons: ManifestIconDiagnostic[];
  serviceWorkerApi: boolean; registrationScope: string | null; activeState: string | null; waitingState: string | null; installingState: string | null; controllingScriptURL: string | null; registrationError: string | null; offlineReady: boolean;
  capturedPrompt: boolean; capturedAt: string | null; appInstalledAt: string | null; installState: PwaInstallState;
};

type PwaInstallContextValue = { state: PwaInstallState; visible: boolean; promotionVisible: boolean; canInstall: boolean; isPrompting: boolean; isPendingInstall: boolean; instructionsOpen: boolean; embedded: boolean; browserFamily: BrowserFamily; install: () => Promise<void>; openInstructions: () => void; closeInstructions: () => void; dismissPromotion: () => void; copyCurrentUrl: () => Promise<void>; diagnostics: PwaDiagnostics; refreshDiagnostics: () => Promise<void> };

const MOBILE_QUERY = '(max-width: 900px)';
const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);
function matches(query: string) { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches; }
function routeEligible(pathname: string) { return pathname.startsWith('/pulse') || pathname.startsWith('/map') || pathname.startsWith('/contribute'); }
function promotionDismissed() { return sessionStorage.getItem(PWA_PROMOTION_DISMISSED_KEY) === '1'; }
function passiveState(prompt: BeforeInstallPromptEvent | null) { if (isStandalonePwa()) return 'installed'; if (prompt) return 'eligible'; if (isEmbeddedBrowser()) return 'embedded'; if (supportsIosManualInstall()) return 'ios'; return 'waiting'; }
export function hasPwaDebugParam() { const search = new URLSearchParams(window.location.search); if (search.get('debug') === '1') return true; const hashQuery = window.location.hash.split('?')[1]?.split('#')[0] ?? ''; return new URLSearchParams(hashQuery).get('debug') === '1'; }
function safeError(error: unknown) { return error instanceof Error ? error.message.slice(0, 240) : String(error).slice(0, 240); }
function emptyDiagnostics(state: PwaInstallState): PwaDiagnostics { const bridge = getPwaInstallBridgeSnapshot(); const runtime = getPwaRuntimeSnapshot(); return { url: window.location.href, pathname: window.location.pathname, hashRoute: window.location.hash, userAgent: navigator.userAgent, browserFamily: bridge.browserFamily, embedded: bridge.embedded, secureContext: window.isSecureContext, standalone: bridge.standalone, manifestUrl: null, manifestFetch: 'idle', manifestError: null, manifestId: null, startUrl: null, scope: null, icons: [], serviceWorkerApi: 'serviceWorker' in navigator, registrationScope: runtime.registrationScope, activeState: runtime.activeState, waitingState: runtime.waitingState, installingState: runtime.installingState, controllingScriptURL: runtime.controllingScriptURL, registrationError: runtime.registrationError, offlineReady: runtime.offlineReady, capturedPrompt: Boolean(bridge.deferredPrompt), capturedAt: bridge.capturedAt, appInstalledAt: bridge.appInstalledAt, installState: state }; }

async function loadManifestDiagnostics(state: PwaInstallState): Promise<PwaDiagnostics> {
  const diagnostics = emptyDiagnostics(state);
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link?.href) return diagnostics;
  diagnostics.manifestUrl = link.href;
  try {
    const response = await fetch(link.href, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const manifest = await response.json() as { id?: string; start_url?: string; scope?: string; icons?: ManifestIconDiagnostic[] };
    diagnostics.manifestFetch = 'ok'; diagnostics.manifestId = manifest.id ?? null; diagnostics.startUrl = manifest.start_url ? new URL(manifest.start_url, link.href).href : null; diagnostics.scope = manifest.scope ? new URL(manifest.scope, link.href).href : null;
    diagnostics.icons = await Promise.all((manifest.icons ?? []).map(async (icon) => { const src = new URL(icon.src, link.href).href; if (!/(^|\s)(192x192|512x512)(\s|$)/.test(icon.sizes ?? '')) return { ...icon, src }; try { const iconResponse = await fetch(src, { method: 'HEAD', cache: 'no-store' }); return { ...icon, src, ok: iconResponse.ok, status: iconResponse.status }; } catch (error) { return { ...icon, src, ok: false, error: safeError(error) }; } }));
  } catch (error) { diagnostics.manifestFetch = 'error'; diagnostics.manifestError = safeError(error); }
  return diagnostics;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [bridge, setBridge] = useState(() => getPwaInstallBridgeSnapshot());
  const [runtimeTick, setRuntimeTick] = useState(0);
  const [state, setState] = useState<PwaInstallState>(() => passiveState(getPwaInstallBridgeSnapshot().deferredPrompt));
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [promotionHidden, setPromotionHidden] = useState(() => promotionDismissed());
  const [mobile, setMobile] = useState(() => matches(MOBILE_QUERY));
  const [diagnostics, setDiagnostics] = useState(() => emptyDiagnostics(state));

  useEffect(() => subscribePwaInstallBridge(() => { const next = getPwaInstallBridgeSnapshot(); setBridge(next); setState(passiveState(next.deferredPrompt)); }), []);
  useEffect(() => subscribePwaRuntime(() => setRuntimeTick((tick) => tick + 1)), []);
  useEffect(() => { const mql = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null; const sync = () => setMobile(matches(MOBILE_QUERY)); mql?.addEventListener?.('change', sync); return () => mql?.removeEventListener?.('change', sync); }, []);
  const refreshDiagnostics = useCallback(async () => setDiagnostics(await loadManifestDiagnostics(state)), [state]);
  useEffect(() => { const timer = window.setTimeout(() => { void refreshDiagnostics(); }, 0); return () => window.clearTimeout(timer); }, [location.pathname, location.search, location.hash, bridge, runtimeTick, refreshDiagnostics]);

  const dismissPromotion = useCallback(() => { sessionStorage.setItem(PWA_PROMOTION_DISMISSED_KEY, '1'); setPromotionHidden(true); }, []);
  const install = useCallback(async () => { const event = bridge.deferredPrompt; if (!event || state !== 'eligible') { if (state !== 'pending' && state !== 'prompting') { setInstructionsOpen(true); setState(isEmbeddedBrowser() ? 'embedded' : supportsIosManualInstall() ? 'ios' : 'manual'); } return; } setState('prompting'); try { const consumed = consumeDeferredPrompt(); if (!consumed) { setState(passiveState(null)); return; } await consumed.prompt(); const choice = await consumed.userChoice; if (choice.outcome === 'accepted') setState(isStandalonePwa() ? 'installed' : 'pending'); else { sessionStorage.setItem(PWA_PROMOTION_DISMISSED_KEY, '1'); setPromotionHidden(true); setState(passiveState(null)); } } catch { setState('error'); } }, [bridge.deferredPrompt, state]);
  const openInstructions = useCallback(() => { if (state === 'pending' || state === 'prompting') return; setInstructionsOpen(true); if (!bridge.deferredPrompt) setState(isEmbeddedBrowser() ? 'embedded' : supportsIosManualInstall() ? 'ios' : 'manual'); }, [bridge.deferredPrompt, state]);
  const copyCurrentUrl = useCallback(async () => { await navigator.clipboard?.writeText(window.location.href); }, []);

  const visible = state !== 'installed' && (mobile || state === 'eligible' || state === 'prompting' || state === 'pending') && routeEligible(location.pathname);
  const value = useMemo(() => ({ state, visible, promotionVisible: visible && !promotionHidden, canInstall: state === 'eligible', isPrompting: state === 'prompting', isPendingInstall: state === 'pending', instructionsOpen, embedded: state === 'embedded', browserFamily: detectBrowserFamily(), install, openInstructions, closeInstructions: () => setInstructionsOpen(false), dismissPromotion, copyCurrentUrl, diagnostics, refreshDiagnostics }), [copyCurrentUrl, diagnostics, dismissPromotion, install, instructionsOpen, openInstructions, promotionHidden, refreshDiagnostics, state, visible]);
  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() { const context = useContext(PwaInstallContext); if (!context) throw new Error('usePwaInstall must be used inside PwaInstallProvider'); return context; }
