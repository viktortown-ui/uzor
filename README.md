# УЗОР

В репозитории заложен backend-фундамент нового объекта “Дельта”: геопривязанные положительные и отрицательные изменения с независимыми подтверждениями.

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
- `/wrapped` — личный недельный dashboard Wrapped реальности: компактная неоновая легенда недели с сигналами, независимыми подтверждениями, точностью, темами, прогрессом XP и красивым empty state.
- `/map` — карта дельт Перми: viewport-загрузка дельт, MapLibre + OpenFreeMap, карточка и confirm/disconfirm реакции.
- `/lab/delta-create-core` — лабораторное UI-ядро конструктора Дельты.

## Ручные шаги владельца
1. Создать Supabase project.
2. Включить Anonymous Sign-In.
3. Применить `supabase/migrations/001_uzor_init.sql` и `supabase/seed/seed_time_city.sql`.
4. Добавить GitHub Variables `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Включить GitHub Pages → GitHub Actions.
6. Войти по приглашению `REPLACE_WITH_A_LONG_PRIVATE_INVITE_CODE` и назначить себя curator по `docs/SUPABASE_SETUP.md`.

Подробно: `docs/SUPABASE_SETUP.md`, `docs/DEPLOYMENT.md`, `docs/QA_CHECKLIST.md`.

## MVP 1.1: demo и production

### Demo

```bash
VITE_APP_MODE=demo npm run dev
```

Демо использует только локальные вымышленные данные и всегда показывает бейдж `ДЕМО — данные вымышлены`.

### Production

```bash
VITE_APP_MODE=production \
VITE_SUPABASE_URL=https://<project>.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key> \
npm run dev
```

Production не использует demo fixtures. Пользователь входит через hash invite URL:

```text
https://<owner>.github.io/uzor/#/join?code=REPLACE_WITH_A_LONG_PRIVATE_INVITE_CODE
```

Ручная настройка Supabase:
1. Применить migrations `001_uzor_init.sql`, затем `002_uzor_integrity_and_curator.sql`, `003_uzor_read_rpc.sql` и `004_weekly_wrapped_rpc.sql`, затем `005_fix_wrapped_report_sql_and_confirmation.sql`.
2. Включить Anonymous Sign-In в Supabase Auth.
3. Создать первый закрытый круг и тему; код приглашения должен быть длинным, случайным и не коммититься. В seed и документации оставлен только placeholder `REPLACE_WITH_A_LONG_PRIVATE_INVITE_CODE`.
4. Добавить GitHub repository variables `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`; service role key не нужен на клиенте.
5. Для GitHub Pages выбрать `Repository Settings → Pages → Source: GitHub Actions`.

GitHub Pages публикует только фронтенд. Данные круга защищаются Supabase RLS; чужие сырые contributions и raw candidate text не выдаются на публичное полотно.

- `/lab/delta-create-geo` — лабораторный конструктор с географией и поиском похожих Дельт.
