import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type BeforeInstallPromptChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
export type BeforeInstallPromptEvent = Event & { platforms?: string[]; prompt: () => Promise<void>; userChoice: Promise<BeforeInstallPromptChoice> };
type IosNavigator = Navigator & { standalone?: boolean };
export type PwaInstallState = 'waiting' | 'eligible' | 'manual' | 'ios' | 'prompting' | 'pending' | 'installed' | 'error';
export const PWA_PROMOTION_DISMISSED_KEY = 'uzor:pwa-promotion-dismissed';

type PwaInstallContextValue = {
  state: PwaInstallState;
  visible: boolean;
  promotionVisible: boolean;
  canInstall: boolean;
  isPrompting: boolean;
  isPendingInstall: boolean;
  instructionsOpen: boolean;
  install: () => Promise<void>;
  openInstructions: () => void;
  closeInstructions: () => void;
  dismissPromotion: () => void;
  diagnostics: PwaDiagnostics;
};

type PwaDiagnostics = { route: string; standalone: boolean; serviceWorkerApi: boolean; serviceWorkerControlled: boolean; capturedPrompt: boolean; installState: PwaInstallState; platform: string };

const MOBILE_QUERY = '(max-width: 900px)';
const STANDALONE_QUERY = '(display-mode: standalone)';
const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function matches(query: string) { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches; }
export function isStandalonePwa() { return matches(STANDALONE_QUERY) || (navigator as IosNavigator).standalone === true; }
export function isAppleMobileOrTablet() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function isSafariFamily() { return /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(navigator.userAgent); }
export function supportsIosManualInstall() { return isAppleMobileOrTablet() && isSafariFamily(); }
function platformFamily() { if (supportsIosManualInstall()) return 'ios-safari'; if (/Android/.test(navigator.userAgent)) return 'android'; if (/Chrome|Chromium|CriOS/.test(navigator.userAgent)) return 'chromium'; return 'browser'; }
function routeEligible(pathname: string) { return pathname.startsWith('/pulse') || pathname.startsWith('/map') || pathname.startsWith('/contribute'); }
function passiveState(prompt: BeforeInstallPromptEvent | null) { if (isStandalonePwa()) return 'installed'; if (prompt) return 'eligible'; if (supportsIosManualInstall()) return 'ios'; return 'waiting'; }
function promotionDismissed() { return sessionStorage.getItem(PWA_PROMOTION_DISMISSED_KEY) === '1'; }

export function hasPwaDebugParam() {
  const search = new URLSearchParams(window.location.search);
  if (search.get('debug') === '1') return true;
  const hashQuery = window.location.hash.split('?')[1]?.split('#')[0] ?? '';
  return new URLSearchParams(hashQuery).get('debug') === '1';
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PwaInstallState>(() => passiveState(null));
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [promotionHidden, setPromotionHidden] = useState(() => promotionDismissed());
  const [mobile, setMobile] = useState(() => matches(MOBILE_QUERY));
  const [standalone, setStandalone] = useState(() => isStandalonePwa());
  const [serviceWorkerControlled, setServiceWorkerControlled] = useState(() => Boolean(navigator.serviceWorker?.controller));

  useEffect(() => {
    const standaloneMql = typeof window.matchMedia === 'function' ? window.matchMedia(STANDALONE_QUERY) : null;
    const mobileMql = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    const syncStandalone = () => { const installed = isStandalonePwa(); setStandalone(installed); if (installed) { promptRef.current = null; setPromptEvent(null); setInstructionsOpen(false); setState('installed'); } };
    const syncMobile = () => setMobile(matches(MOBILE_QUERY));
    const beforeInstall = (event: Event) => { event.preventDefault(); if (isStandalonePwa()) return; const next = event as BeforeInstallPromptEvent; promptRef.current = next; setPromptEvent(next); setInstructionsOpen(false); setState('eligible'); };
    const installed = () => { promptRef.current = null; setPromptEvent(null); setInstructionsOpen(false); setStandalone(true); setState('installed'); };
    const controllerChange = () => setServiceWorkerControlled(Boolean(navigator.serviceWorker?.controller));
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    standaloneMql?.addEventListener?.('change', syncStandalone);
    mobileMql?.addEventListener?.('change', syncMobile);
    navigator.serviceWorker?.addEventListener?.('controllerchange', controllerChange);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installed); standaloneMql?.removeEventListener?.('change', syncStandalone); mobileMql?.removeEventListener?.('change', syncMobile); navigator.serviceWorker?.removeEventListener?.('controllerchange', controllerChange); };
  }, []);

  const dismissPromotion = useCallback(() => { sessionStorage.setItem(PWA_PROMOTION_DISMISSED_KEY, '1'); setPromotionHidden(true); }, []);
  const install = useCallback(async () => {
    const event = promptRef.current;
    if (!event || state !== 'eligible') { if (state !== 'pending' && state !== 'prompting') { setInstructionsOpen(true); setState(supportsIosManualInstall() ? 'ios' : 'manual'); } return; }
    setState('prompting');
    try { await event.prompt(); const choice = await event.userChoice; promptRef.current = null; setPromptEvent(null); if (choice.outcome === 'accepted') setState(isStandalonePwa() ? 'installed' : 'pending'); else { sessionStorage.setItem(PWA_PROMOTION_DISMISSED_KEY, '1'); setPromotionHidden(true); setState(passiveState(null)); } }
    catch { promptRef.current = null; setPromptEvent(null); setState('error'); }
  }, [state]);
  const openInstructions = useCallback(() => { if (state === 'pending' || state === 'prompting') return; setInstructionsOpen(true); if (!promptRef.current) setState(supportsIosManualInstall() ? 'ios' : 'manual'); }, [state]);

  const diagnostics = useMemo(() => ({ route: location.pathname, standalone, serviceWorkerApi: 'serviceWorker' in navigator, serviceWorkerControlled, capturedPrompt: Boolean(promptEvent), installState: state, platform: platformFamily() }), [location.pathname, promptEvent, serviceWorkerControlled, standalone, state]);
  const visible = state !== 'installed' && (mobile || state === 'eligible' || state === 'prompting' || state === 'pending') && routeEligible(location.pathname);
  const value = useMemo(() => ({ state, visible, promotionVisible: visible && !promotionHidden, canInstall: state === 'eligible', isPrompting: state === 'prompting', isPendingInstall: state === 'pending', instructionsOpen, install, openInstructions, closeInstructions: () => setInstructionsOpen(false), dismissPromotion, diagnostics }), [diagnostics, dismissPromotion, install, instructionsOpen, openInstructions, promotionHidden, state, visible]);
  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() { const context = useContext(PwaInstallContext); if (!context) throw new Error('usePwaInstall must be used inside PwaInstallProvider'); return context; }
