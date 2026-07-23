export type BeforeInstallPromptChoice = { outcome: 'accepted' | 'dismissed'; platform: string };
export type BeforeInstallPromptEvent = Event & { platforms?: string[]; prompt: () => Promise<void>; userChoice: Promise<BeforeInstallPromptChoice> };
type IosNavigator = Navigator & { standalone?: boolean };
export type BrowserFamily = 'android-chrome' | 'android-webview' | 'telegram' | 'instagram' | 'facebook' | 'ios-safari' | 'ios-chrome' | 'ios-edge' | 'ios-firefox' | 'desktop-chromium' | 'safari' | 'browser';
export type PwaBridgeSnapshot = { deferredPrompt: BeforeInstallPromptEvent | null; capturedAt: string | null; appInstalledAt: string | null; standalone: boolean; installed: boolean; browserFamily: BrowserFamily; embedded: boolean };

type Listener = () => void;
const STANDALONE_QUERY = '(display-mode: standalone)';
const listeners = new Set<Listener>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let capturedAt: string | null = null;
let appInstalledAt: string | null = null;
let installed = false;
let registered = false;

function hasWindow() { return typeof window !== 'undefined' && typeof navigator !== 'undefined'; }
function matches(query: string) { return hasWindow() && typeof window.matchMedia === 'function' && window.matchMedia(query).matches; }
export function isStandalonePwa() { return matches(STANDALONE_QUERY) || (navigator as IosNavigator).standalone === true; }
function isInstalled() { installed = installed || isStandalonePwa(); return installed; }
export function isAppleMobileOrTablet() { return hasWindow() && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)); }
function isSafariFamily() { return hasWindow() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(navigator.userAgent); }
export function supportsIosManualInstall() { return isAppleMobileOrTablet() && isSafariFamily(); }
export function detectBrowserFamily(): BrowserFamily {
  if (!hasWindow()) return 'browser';
  const ua = navigator.userAgent;
  if (/Telegram/i.test(ua)) return 'telegram';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBios/i.test(ua)) return 'facebook';
  if (/Android/.test(ua) && (/; wv\)/.test(ua) || /Version\/4\.0/.test(ua))) return 'android-webview';
  if (isAppleMobileOrTablet() && /CriOS/.test(ua)) return 'ios-chrome';
  if (isAppleMobileOrTablet() && /EdgiOS/.test(ua)) return 'ios-edge';
  if (isAppleMobileOrTablet() && /FxiOS/.test(ua)) return 'ios-firefox';
  if (supportsIosManualInstall()) return 'ios-safari';
  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'android-chrome';
  if (/Chrome|Chromium|Edg\//.test(ua)) return 'desktop-chromium';
  if (isSafariFamily()) return 'safari';
  return 'browser';
}
export function isEmbeddedBrowser() { return ['android-webview', 'telegram', 'instagram', 'facebook'].includes(detectBrowserFamily()); }
function emit() { listeners.forEach((listener) => listener()); }
function beforeInstall(event: Event) { event.preventDefault(); if (isInstalled() || isEmbeddedBrowser()) return; deferredPrompt = event as BeforeInstallPromptEvent; capturedAt = new Date().toISOString(); emit(); }
function appInstalled() { deferredPrompt = null; installed = true; appInstalledAt = new Date().toISOString(); emit(); }
export function ensurePwaInstallBridgeStarted() { if (!hasWindow() || registered) return; installed = isStandalonePwa(); registered = true; window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', appInstalled); }
export function subscribePwaInstallBridge(listener: Listener) { ensurePwaInstallBridgeStarted(); listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getPwaInstallBridgeSnapshot(): PwaBridgeSnapshot { const standalone = isStandalonePwa(); if (standalone) installed = true; return { deferredPrompt, capturedAt, appInstalledAt, standalone, installed, browserFamily: detectBrowserFamily(), embedded: isEmbeddedBrowser() }; }
export function consumeDeferredPrompt({ emitUpdate = false } = {}) { const event = deferredPrompt; deferredPrompt = null; if (emitUpdate) emit(); return event; }
export function resetPwaInstallBridgeForTests() { deferredPrompt = null; capturedAt = null; appInstalledAt = null; installed = isStandalonePwa(); emit(); }

ensurePwaInstallBridgeStarted();
