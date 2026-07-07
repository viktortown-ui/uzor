# Supabase setup

1. Создайте проект Supabase.
2. Authentication → Providers → включите Anonymous Sign-Ins.
3. SQL Editor → выполните `supabase/migrations/001_uzor_init.sql`.
4. SQL Editor → выполните `supabase/seed/seed_time_city.sql`.
5. В Project Settings → API скопируйте Project URL и publishable anon key. Не используйте service role key во фронтенде.
6. Первый вход: откройте сайт с `?join=UZOR-DEMO-2026` или страницу `/join`.
7. Назначьте себя куратором после входа:

```sql
update public.circle_memberships
set role = 'curator'
where user_id = '<uuid вашего auth.users.id>';
```

UUID можно найти в Authentication → Users. Куратор видит кандидатов своего круга и может одобрять/отклонять их.
