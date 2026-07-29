\set ON_ERROR_STOP on
begin;
create schema if not exists auth;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
create table public.circles(id uuid primary key,name text,context text,invite_code_hash text);
create table public.circle_memberships(circle_id uuid references public.circles,user_id uuid references auth.users,role text default 'participant',joined_at timestamptz default now(),primary key(circle_id,user_id));
insert into public.circles values('10000000-0000-0000-0000-000000000001','Пермь','Город','not-an-invite');
insert into auth.users values('20000000-0000-0000-0000-000000000001');
\ir ../supabase/migrations/010_open_city_access.sql
do $$ begin perform public.ensure_open_city_membership('perm'); raise exception 'unauthenticated call was accepted'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$ begin perform public.ensure_open_city_membership('perm'); raise exception 'anonymous call was accepted'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select * from public.ensure_open_city_membership('perm');
select * from public.ensure_open_city_membership('perm');
do $$ begin if (select count(*) from public.circle_memberships)<>1 then raise exception 'duplicate membership'; end if; if (select role from public.circle_memberships)<>'participant' then raise exception 'unexpected role'; end if; end $$;
update public.open_city_circles set is_open=false where city_slug='perm';
do $$ begin perform public.ensure_open_city_membership('perm'); raise exception 'disabled city accepted'; exception when insufficient_privilege then null; end $$;
rollback;
