# Deployment

## GitHub Pages
1. Repository Settings → Pages → Source: GitHub Actions.
2. Repository Settings → Secrets and variables → Actions → Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Push в `main` запустит `.github/workflows/deploy-pages.yml`.

Workflow не запускает SQL migrations и не использует service role.

## GitHub Pages и закрытый invite

GitHub Pages workflow использует GitHub Actions. В настройках репозитория откройте `Settings → Pages` и выберите `Source: GitHub Actions`; migrations из Pages workflow не запускаются, service role key там не нужен и не должен добавляться.

Каноническая ссылка приглашения для Pages использует hash routing:

```text
https://<owner>.github.io/uzor/#/join?code=REPLACE_WITH_A_LONG_PRIVATE_INVITE_CODE
```

Код приглашения должен быть длинным, случайным, храниться вне git и подставляться только вручную при создании круга/секрета. Фронтенд публикуется на GitHub Pages, а доступ к теме, каталогу, snapshot и кандидатам защищается Supabase RLS и RPC.
