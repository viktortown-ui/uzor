# Supabase setup

1. Создайте проект и примените миграции `001`–`010` по порядку (`supabase db push` или SQL Editor).
2. Настройте Email OTP и шаблон с `{{ .Token }}` строго по [AUTH_AND_ACCESS](AUTH_AND_ACCESS.md).
3. Проверьте owner mapping `perm` → существующий production circle.
4. Включите production origins в Auth URL Configuration.
5. Передайте фронтенду URL и publishable/anon key. Никогда не передавайте service role.
6. Выполните SQL smoke: `psql --set ON_ERROR_STOP=1 --file scripts/open-city-postgres-smoke.sql`.

RLS и feature-level PostgreSQL authorization остаются обязательными. Migration 010 не раскрывает circle до успешной membership bootstrap и не повышает роль до curator.
