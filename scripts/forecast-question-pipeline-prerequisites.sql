\set ON_ERROR_STOP on
create extension if not exists pgcrypto;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}') $$;
create table if not exists public.circles(id uuid primary key default gen_random_uuid());
create table if not exists public.circle_memberships(circle_id uuid references public.circles(id), user_id uuid references auth.users, role text not null default 'participant',primary key(circle_id,user_id));

create or replace function public.is_member(input_circle_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.circle_memberships where circle_id=input_circle_id and user_id=auth.uid()) $$;
create table if not exists public.delta_cities(id uuid primary key default gen_random_uuid(),slug text unique not null,is_active boolean not null default true);
create table if not exists public.deltas(id uuid primary key default gen_random_uuid(),circle_id uuid not null references public.circles(id),city_id uuid not null references public.delta_cities(id));
