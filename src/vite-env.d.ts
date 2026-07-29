/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
    onOfflineReady?: () => void;
    onNeedRefresh?: () => void;
  }): (reloadPage?: boolean) => Promise<void>;
}

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;
