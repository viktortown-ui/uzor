# Deployment

Production публикуется GitHub Pages workflow. Задайте repository variables/secrets для `VITE_APP_MODE=production`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; publishable key допустим в bundle, service role — нет. Примените migrations 001–010 отдельно до релиза и проверьте Perm mapping.

Локально воспроизведите обе геометрии base path:

```bash
VITE_BASE_PATH=/ npm run build
VITE_BASE_PATH=/uzor/ npm run build
npm run test:pwa-installability
```

HashRouter сохраняет route/query после `#`. Email OTP вводится в приложении, поэтому magic-link redirect не является основным входом. После deploy проверьте `/auth`, OTP, `/map?delta=…`, Settings, install prompt и service worker update.
