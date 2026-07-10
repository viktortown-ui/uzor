# Supabase setup

1. Создайте проект Supabase.
2. Authentication → Providers → включите Anonymous Sign-Ins.
3. SQL Editor → выполните `supabase/migrations/001_uzor_init.sql`.
4. SQL Editor → выполните `supabase/seed/seed_time_city.sql`.
5. SQL Editor → выполните `supabase/migrations/002_uzor_integrity_and_curator.sql`.
6. SQL Editor → выполните `supabase/migrations/003_uzor_read_rpc.sql`. Этот hotfix добавляет безопасные RPC для чтения темы, каталога и snapshot: он не пересоздаёт таблицы, не удаляет круг, тему, карточки или вклады.
7. SQL Editor → выполните `supabase/migrations/004_weekly_wrapped_rpc.sql`. Он добавляет безопасный RPC `get_my_wrapped_report` для `/wrapped`: только личные строки пользователя и агрегаты круга без raw contributions других участников.
8. SQL Editor → выполните `supabase/migrations/005_fix_wrapped_report_sql_and_confirmation.sql`. Hotfix переопределяет RPC: заменяет `JOIN ... USING(layer, signal_id, consequence_id)` на явные `ON`, фиксирует подтверждение как `participants >= 2` и делает `notify pgrst, 'reload schema'`.
9. После применения migrations больше ничего вручную пересоздавать не нужно: сделайте GitHub merge и дождитесь зелёного Deploy Pages.
10. В Project Settings → API скопируйте Project URL и publishable anon key. Не используйте service role key во фронтенде.
11. Первый вход: откройте сайт с `?join=REPLACE_WITH_A_LONG_PRIVATE_INVITE_CODE` или страницу `/join`.
12. Назначьте себя куратором после входа:

```sql
update public.circle_memberships
set role = 'curator'
where user_id = '<uuid вашего auth.users.id>';
```

UUID можно найти в Authentication → Users. Куратор видит кандидатов своего круга и может одобрять/отклонять их.

## Migration 006: Delta MVP foundation

После merge вручную выполните `supabase/migrations/006_delta_foundation.sql` в Supabase SQL Editor. Migration добавляет backend-фундамент объекта «Дельта» и не изменяет migrations 001–005.

PostGIS обязателен: migration создаёт schema `extensions`, включает `postgis` через `create extension if not exists postgis with schema extensions` и использует `search_path = public, extensions, gis`. Проверка extension:

```sql
select extname, extnamespace::regnamespace from pg_extension where extname = 'postgis';
```

Проверка таблиц:

```sql
select table_name from information_schema.tables where table_schema = 'public' and table_name in ('delta_cities','delta_categories','deltas','delta_reactions');
```

Проверка RPC:

```sql
select proname from pg_proc join pg_namespace n on n.oid = pronamespace where n.nspname = 'public' and proname in ('create_delta','react_to_delta','get_delta_card','find_similar_deltas','list_deltas_in_view');
```


### Hotfix migration 006

Ранняя версия `006_delta_foundation.sql` могла падать в Supabase SQL Editor с `ERROR 42883` при создании `delta_card_json`: `ST_Distance(...)` для `geography` возвращает `double precision`, а старая сигнатура `public.calculate_delta_priority` ожидала `distance_from_center_m numeric`.

После merge hotfix заново скопируйте весь обновлённый файл `supabase/migrations/006_delta_foundation.sql` и выполните его целиком в Supabase SQL Editor. Частично созданные таблицы, индексы, seed-строки `delta_cities` / `delta_categories` и функции удалять не нужно: migration безопасна для повторного запуска и не требует очистки данных.

Ожидаемый результат выполнения полного файла:

```text
Success. No rows returned
```

`create_delta` и остальные write/read RPC проверяют `auth.uid()` и membership. Не вызывайте `create_delta` из SQL Editor без auth context: ошибка `not_authenticated` в этом случае ожидаема и не означает поломку migration.
