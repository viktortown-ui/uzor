import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/');

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'), __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      devOptions: { enabled: false },
      pwaAssets: {
        preset: 'minimal-2023',
        image: 'public/favicon.svg',
        overrideManifestIcons: true,
        injectThemeColor: false,
      },
      manifest: {
        id: './',
        name: 'УЗОР — карта городских изменений',
        short_name: 'УЗОР',
        description: 'Карта наблюдаемых городских изменений и недельный пульс города.',
        lang: 'ru',
        display: 'standalone',
        background_color: '#050b16',
        theme_color: '#050b16',
        start_url: './#/pulse',
        scope: './',
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        globIgnores: ['**/{maplibre-gl,DeltaMapPage,DeltaCreatePage,DesktopDeltaCreateFlow,DeltaCreateLabPage,DeltaCreateGeoLabPage,ForecastPage,ForecastResolverPage,LabShell,LabV4Shell,WrappedReferencePage,WrappedReferenceV2Page}-*.{js,css}'],
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: /\/assets\/(?:maplibre-gl|DeltaMapPage|DeltaCreatePage|DesktopDeltaCreateFlow|DeltaCreateLabPage|DeltaCreateGeoLabPage|ForecastPage|ForecastResolverPage|LabShell|LabV4Shell|WrappedReferencePage|WrappedReferenceV2Page)-.*\.(?:js|css)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'uzor-route-chunks-v1', expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 } },
        }],
      },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './vitest.setup.ts', css: true },
});
