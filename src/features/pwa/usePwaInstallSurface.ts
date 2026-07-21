import { useCallback, useEffect, useMemo, useState } from 'react';

export type BeforeInstallPromptChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
export type BeforeInstallPromptEvent = Event & {
  platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};
type IosNavigator = Navigator & { standalone?: boolean };
export type PwaInstallState = 'hidden' | 'waiting' | 'eligible' | 'prompting' | 'accepted-awaiting-installation' | 'ios-instructions' | 'unsupported-instructions' | 'dismissed' | 'error';
const DISMISSED_KEY = 'uzor:pwa-install-dismissed';
const MOBILE_QUERY = '(max-width: 900px)';
const STANDALONE_QUERY = '(display-mode: standalone)';

function hasMatch(query: string): boolean { return typeof window.matchMedia === 'function' && window.matchMedia(query).matches; }
export function isStandalonePwa(): boolean { return hasMatch(STANDALONE_QUERY) || (navigator as IosNavigator).standalone === true; }
export function isAppleMobileOrTablet(): boolean {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isSafariFamily(): boolean { return /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(navigator.userAgent); }
export function supportsIosManualInstall(): boolean { return isAppleMobileOrTablet() && isSafariFamily(); }
function isMobileWidth(): boolean { return hasMatch(MOBILE_QUERY); }

export function usePwaInstallSurface() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PwaInstallState>(() => {
    if (typeof window === 'undefined' || isStandalonePwa()) return 'hidden';
    if (sessionStorage.getItem(DISMISSED_KEY) === '1') return 'dismissed';
    if (!isMobileWidth()) return 'hidden';
    return supportsIosManualInstall() ? 'ios-instructions' : 'waiting';
  });
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const recomputePassiveState = useCallback((event: BeforeInstallPromptEvent | null = promptEvent) => {
    if (isStandalonePwa()) { setPromptEvent(null); setState('hidden'); return; }
    if (sessionStorage.getItem(DISMISSED_KEY) === '1') { setState('dismissed'); return; }
    if (event) { setState('eligible'); return; }
    if (!isMobileWidth()) { setState('hidden'); return; }
    setState(supportsIosManualInstall() ? 'ios-instructions' : 'waiting');
  }, [promptEvent]);

  useEffect(() => {
    const standalone = typeof window.matchMedia === 'function' ? window.matchMedia(STANDALONE_QUERY) : null;
    const mobile = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    const sync = () => recomputePassiveState();
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      if (isStandalonePwa()) return;
      const installEvent = event as BeforeInstallPromptEvent;
      setPromptEvent(installEvent);
      setFallbackOpen(false);
      setState('eligible');
    };
    const installed = () => { setPromptEvent(null); setState('hidden'); };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    standalone?.addEventListener?.('change', sync);
    mobile?.addEventListener?.('change', sync);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      standalone?.removeEventListener?.('change', sync);
      mobile?.removeEventListener?.('change', sync);
    };
  }, [recomputePassiveState]);

  const install = useCallback(async () => {
    const event = promptEvent;
    if (!event || state !== 'eligible') return;
    setState('prompting');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setPromptEvent(null);
      if (choice.outcome === 'accepted') setState(isStandalonePwa() ? 'hidden' : 'accepted-awaiting-installation');
      else { sessionStorage.setItem(DISMISSED_KEY, '1'); setState('dismissed'); }
    } catch {
      setPromptEvent(null);
      setState('error');
    }
  }, [promptEvent, state]);

  const dismiss = useCallback(() => { sessionStorage.setItem(DISMISSED_KEY, '1'); setPromptEvent(null); setState('dismissed'); }, []);
  const openInstructions = useCallback(() => { setFallbackOpen(true); if (state === 'waiting') setState('unsupported-instructions'); }, [state]);
  const visible = state !== 'hidden' && state !== 'dismissed' && (isMobileWidth() || state === 'eligible' || state === 'prompting' || state === 'accepted-awaiting-installation');

  return useMemo(() => ({
    state, visible, canInstall: state === 'eligible', isPrompting: state === 'prompting', isPendingInstall: state === 'accepted-awaiting-installation',
    showIosInstructions: state === 'ios-instructions', showFallbackInstructions: fallbackOpen && (state === 'waiting' || state === 'unsupported-instructions' || state === 'error'),
    install, dismiss, openInstructions,
  }), [dismiss, fallbackOpen, install, openInstructions, state, visible]);
}
