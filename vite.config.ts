import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/');

export default defineConfig({
  base,
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
        name: 'УЗОР — время города',
        short_name: 'УЗОР',
        description: 'УЗОР показывает наблюдаемые изменения в городе.',
        lang: 'ru',
        display: 'standalone',
        background_color: '#050b16',
        theme_color: '#050b16',
        start_url: './#/pulse',
        scope: './',
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './vitest.setup.ts', css: true },
});
