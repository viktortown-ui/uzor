# Аутентификация и доступ

## Supabase Email OTP

1. В Supabase Dashboard откройте **Authentication → Providers → Email** и включите Email provider и email confirmations.
2. Откройте **Authentication → Email Templates → Magic Link**. Чтобы Supabase отправлял числовой OTP, поместите в тело шаблона `{{ .Token }}` (не используйте только `{{ .ConfirmationURL }}`). Например: `Код для входа в УЗОР: {{ .Token }}`.
3. Настройте sender/SMTP и rate limits для production. Добавьте GitHub Pages origin в Site URL / Redirect URLs как защиту для служебных flows; основной in-page `verifyOtp({ type: 'email' })` не зависит от hash redirect.
4. Задайте клиенту только `VITE_SUPABASE_URL` и publishable/anon key. Service role остаётся только в защищённой серверной среде.

Состояния клиента: loading, unauthenticated, authenticated real user, legacy anonymous и bootstrap error. Гостевая сессия не считается аккаунтом и не уничтожается автоматически. Вход по email не обещает перенос старого авторства.

## Открытая Пермь

Миграция 010 создаёт `open_city_circles(city_slug,circle_id,is_open,created_at)` и `ensure_open_city_membership(text)`. RPC требует `auth.uid()`, отклоняет anonymous JWT, выдаёт только city/circle/participant context и идемпотентно создаёт membership без curator role.

Автоматическое связывание отключено: даже единственный частный круг не становится публичным. Владелец должен определить production circle и выполнить в SQL Editor (подставив существующий UUID, не invite code):

```sql
insert into public.open_city_circles(city_slug,circle_id,is_open)
values ('perm','00000000-0000-0000-0000-000000000000',true)
on conflict(city_slug) do update set circle_id=excluded.circle_id,is_open=true;
```

Проверьте выбор: `select city_slug,circle_id,is_open from public.open_city_circles;`. Не создавайте новый круг ради mapping и не перемещайте существующие Дельты.
