# УЗОР

УЗОР — закрытая игра-картина, где 12–30 участников вместе показывают, как тема «Время города» забирает и возвращает людям время.

## Быстрый просмотр
```bash
npm ci
npm run dev
```
По умолчанию используйте `VITE_APP_MODE=demo`: появится бейдж «ДЕМО — данные вымышлены».

## Что есть в MVP
- Русский mobile-first интерфейс: поле темы, добавление нити, ветка, куратор, справка.
- Математика без единого рейтинга: напряжение, поддержка и потенциал считаются отдельно.
- Supabase migration с закрытым кругом, anonymous auth, RLS, RPC приглашения и агрегатов.
- GitHub Actions для CI и GitHub Pages deploy.

## Ручные шаги владельца
1. Создать Supabase project.
2. Включить Anonymous Sign-In.
3. Применить `supabase/migrations/001_uzor_init.sql` и `supabase/seed/seed_time_city.sql`.
4. Добавить GitHub Variables `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Включить GitHub Pages → GitHub Actions.
6. Войти по приглашению `UZOR-DEMO-2026` и назначить себя curator по `docs/SUPABASE_SETUP.md`.

Подробно: `docs/SUPABASE_SETUP.md`, `docs/DEPLOYMENT.md`, `docs/QA_CHECKLIST.md`.
