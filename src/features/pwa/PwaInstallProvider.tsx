import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type BeforeInstallPromptChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
export type BeforeInstallPromptEvent = Event & { platforms?: string[]; prompt: () => Promise<void>; userChoice: Promise<BeforeInstallPromptChoice> };
type IosNavigator = Navigator & { standalone?: boolean };
export type PwaInstallState = 'waiting' | 'eligible' | 'manual' | 'ios' | 'prompting' | 'pending' | 'installed' | 'error';

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

type PwaDiagnostics = { route: string; standalone: boolean; serviceWorkerApi: boolean; serviceWorkerControlled: boolean; capturedPrompt: boolean; installed: boolean; platform: string };

const MOBILE_QUERY = '(max-width: 900px)';
const STANDALONE_QUERY = '(display-mode: standalone)';
const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function matches(query: string) { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches; }
export function isStandalonePwa() { return matches(STANDALONE_QUERY) || (navigator as IosNavigator).standalone === true; }
export function isAppleMobileOrTablet() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function isSafariFamily() { return /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(navigator.userAgent); }
export function supportsIosManualInstall() { return isAppleMobileOrTablet() && isSafariFamily(); }
function platformFamily() { if (supportsIosManualInstall()) return isAppleMobileOrTablet() ? 'ios-safari' : 'safari'; if (/Android/.test(navigator.userAgent)) return 'android'; if (/Chrome|Chromium|CriOS/.test(navigator.userAgent)) return 'chromium'; return 'browser'; }
function routeEligible(pathname: string) { return pathname.startsWith('/pulse') || pathname.startsWith('/map') || pathname.startsWith('/contribute'); }
function passiveState(prompt: BeforeInstallPromptEvent | null) { if (isStandalonePwa()) return 'installed'; if (prompt) return 'eligible'; if (supportsIosManualInstall()) return 'ios'; return 'waiting'; }

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PwaInstallState>(() => passiveState(null));
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [promotionDismissed, setPromotionDismissed] = useState(false);
  const [mobile, setMobile] = useState(() => matches(MOBILE_QUERY));

  const syncPassive = useCallback((prompt: BeforeInstallPromptEvent | null = promptEvent) => { setMobile(matches(MOBILE_QUERY)); setState(passiveState(prompt)); }, [promptEvent]);

  useEffect(() => {
    const standalone = typeof window.matchMedia === 'function' ? window.matchMedia(STANDALONE_QUERY) : null;
    const mobileMql = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    const beforeInstall = (event: Event) => { event.preventDefault(); if (isStandalonePwa()) return; const next = event as BeforeInstallPromptEvent; setPromptEvent(next); setInstructionsOpen(false); setState('eligible'); };
    const installed = () => { setPromptEvent(null); setInstructionsOpen(false); setState('installed'); };
    const sync = () => syncPassive();
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    standalone?.addEventListener?.('change', sync);
    mobileMql?.addEventListener?.('change', sync);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', installed); standalone?.removeEventListener?.('change', sync); mobileMql?.removeEventListener?.('change', sync); };
  }, [syncPassive]);

  const install = useCallback(async () => {
    if (!promptEvent || state !== 'eligible') { setInstructionsOpen(true); setState(supportsIosManualInstall() ? 'ios' : 'manual'); return; }
    setState('prompting');
    try { await promptEvent.prompt(); const choice = await promptEvent.userChoice; setPromptEvent(null); setState(choice.outcome === 'accepted' ? (isStandalonePwa() ? 'installed' : 'pending') : passiveState(null)); }
    catch { setPromptEvent(null); setState('error'); }
  }, [promptEvent, state]);

  const openInstructions = useCallback(() => { setInstructionsOpen(true); if (!promptEvent) setState(supportsIosManualInstall() ? 'ios' : 'manual'); }, [promptEvent]);
  const diagnostics = useMemo(() => ({ route: location.pathname, standalone: isStandalonePwa(), serviceWorkerApi: 'serviceWorker' in navigator, serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller), capturedPrompt: Boolean(promptEvent), installed: state === 'installed', platform: platformFamily() }), [location.pathname, promptEvent, state]);
  const visible = state !== 'installed' && (mobile || state === 'eligible' || state === 'prompting' || state === 'pending') && routeEligible(location.pathname);
  const value = useMemo(() => ({ state, visible, promotionVisible: visible && !promotionDismissed, canInstall: state === 'eligible', isPrompting: state === 'prompting', isPendingInstall: state === 'pending', instructionsOpen, install, openInstructions, closeInstructions: () => setInstructionsOpen(false), dismissPromotion: () => setPromotionDismissed(true), diagnostics }), [diagnostics, install, instructionsOpen, openInstructions, promotionDismissed, state, visible]);
  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() { const context = useContext(PwaInstallContext); if (!context) throw new Error('usePwaInstall must be used inside PwaInstallProvider'); return context; }
