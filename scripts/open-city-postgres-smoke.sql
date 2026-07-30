\set ON_ERROR_STOP on
begin;
create schema if not exists auth;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
create table public.circles(id uuid primary key,name text,context text,invite_code_hash text);
create table public.circle_memberships(circle_id uuid references public.circles,user_id uuid references auth.users,role text default 'participant',joined_at timestamptz default now(),primary key(circle_id,user_id));
insert into public.circles values
 ('10000000-0000-0000-0000-000000000001','Частный круг','Не Пермь','private'),
 ('10000000-0000-0000-0000-000000000002','Пермь','Город','perm-private');
insert into auth.users values('20000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002');
\ir ../supabase/migrations/010_open_city_access.sql
do $$ begin if exists(select 1 from public.open_city_circles) then raise exception 'a private circle was opened automatically'; end if; end $$;
insert into public.open_city_circles(city_slug,circle_id,is_open) values('perm','10000000-0000-0000-0000-000000000002',true);
do $$ begin perform public.ensure_open_city_membership('perm'); raise exception 'unauthenticated call accepted'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$ begin perform public.ensure_open_city_membership('perm'); raise exception 'anonymous call accepted'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select * from public.ensure_open_city_membership('perm'); select * from public.ensure_open_city_membership('perm');
do $$ begin if (select count(*) from public.circle_memberships where user_id='20000000-0000-0000-0000-000000000001')<>1 then raise exception 'duplicate membership'; end if; if (select role from public.circle_memberships where user_id='20000000-0000-0000-0000-000000000001')<>'participant' then raise exception 'not participant'; end if; end $$;
insert into public.circle_memberships values('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','curator',now());
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',false); select * from public.ensure_open_city_membership('perm');
do $$ begin if (select role from public.circle_memberships where user_id='20000000-0000-0000-0000-000000000002')<>'curator' then raise exception 'curator downgraded'; end if; end $$;
update public.open_city_circles set is_open=false;
do $$ begin perform public.ensure_open_city_membership('perm'); raise exception 'disabled mapping accepted'; exception when insufficient_privilege then null; end $$;
set local role authenticated;
do $$ begin perform 1 from public.open_city_circles; raise exception 'direct table access accepted'; exception when insufficient_privilege then null; end $$;
reset role;
rollback;
