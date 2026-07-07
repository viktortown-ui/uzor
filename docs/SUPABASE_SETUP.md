# Supabase setup

1. Создайте проект Supabase.
2. Authentication → Providers → включите Anonymous Sign-Ins.
3. SQL Editor → выполните `supabase/migrations/001_uzor_init.sql`.
4. SQL Editor → выполните `supabase/seed/seed_time_city.sql`.
5. SQL Editor → выполните `supabase/migrations/002_uzor_integrity_and_curator.sql`.
6. SQL Editor → выполните `supabase/migrations/003_uzor_read_rpc.sql`. Этот hotfix добавляет безопасные RPC для чтения темы, каталога и snapshot: он не пересоздаёт таблицы, не удаляет круг, тему, карточки или вклады.
7. После применения `003_uzor_read_rpc.sql` больше ничего вручную пересоздавать не нужно: сделайте GitHub merge и дождитесь зелёного Deploy Pages.
8. В Project Settings → API скопируйте Project URL и publishable anon key. Не используйте service role key во фронтенде.
9. Первый вход: откройте сайт с `?join=REPLACE_WITH_A_LONG_PRIVATE_INVITE_CODE` или страницу `/join`.
10. Назначьте себя куратором после входа:

```sql
update public.circle_memberships
set role = 'curator'
where user_id = '<uuid вашего auth.users.id>';
```

UUID можно найти в Authentication → Users. Куратор видит кандидатов своего круга и может одобрять/отклонять их.
