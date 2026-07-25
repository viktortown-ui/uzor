-- Verified forecast outcome resolution v1. Application access is RPC-only.
create table public.forecast_resolvers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  note text,
  constraint forecast_resolvers_note_length check (note is null or length(note) <= 500)
);

create table public.forecast_outcomes (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique references public.forecast_events(id) on delete restrict,
  resolved_option_id text not null,
  resolved_at timestamptz not null,
  source_reference text not null,
  source_type text not null,
  resolution_note text not null,
  resolver_status text not null,
  resolver_user_id uuid not null references auth.users(id) on delete restrict,
  domain_version text not null,
  created_at timestamptz not null default now(),
  foreign key (event_id, resolved_option_id) references public.forecast_options(event_id, id) on delete restrict,
  constraint forecast_outcomes_source check (source_type in ('official-publication','municipal-service','retailer-publication','event-organizer','other-reference')),
  constraint forecast_outcomes_status check (resolver_status in ('verified','disputed','pending')),
  constraint forecast_outcomes_version check (domain_version = 'forecast-domain-v1'),
  constraint forecast_outcomes_source_reference check (length(trim(source_reference)) between 1 and 2000),
  constraint forecast_outcomes_resolution_note check (length(trim(resolution_note)) between 1 and 2000)
);

alter table public.forecast_resolvers enable row level security;
alter table public.forecast_outcomes enable row level security;
-- Deliberately no policies: even allowlisted users must go through the security-definer RPCs.

create or replace function public.get_forecast_workspace(input_event_id text default 'sandbox-demo-milk-price-2026-12-15') returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare e public.forecast_events%rowtype; uid uuid := auth.uid(); f public.user_forecasts%rowtype; o public.forecast_outcomes%rowtype; server_time timestamptz := clock_timestamp(); reason text;
begin
  select * into e from public.forecast_events where id=input_event_id;
  if not found then return jsonb_build_object('event',null,'options','[]'::jsonb,'forecast',null,'outcome',null,'server_timestamp',server_time,'authentication_required',uid is null,'submission_permitted',false,'locked',true,'lock_reason','event_not_found'); end if;
  if uid is not null then select * into f from public.user_forecasts where event_id=e.id and user_id=uid; end if;
  if e.status='resolved' then select * into o from public.forecast_outcomes where event_id=e.id and resolver_status='verified'; end if;
  reason := case when uid is null then 'not_authenticated' when e.status <> 'open' then 'event_not_open' when server_time < e.opens_at then 'before_open' when server_time >= e.closes_at then 'deadline_passed' else null end;
  return jsonb_build_object(
    'event',jsonb_build_object('id',e.id,'title',e.title,'short_description',e.short_description,'category',e.category,'city_id',e.city_id,'geographic_scope',e.geographic_scope,'opens_at',e.opens_at,'closes_at',e.closes_at,'resolves_at',e.resolves_at,'resolution_window_starts_at',e.resolution_window_starts_at,'resolution_window_ends_at',e.resolution_window_ends_at,'status',e.status,'resolution_source',e.resolution_source,'is_demo',e.is_demo,'domain_version',e.domain_version,'created_at',e.created_at),
    'options',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'label',x.label,'description',x.description) order by x.sort_order),'[]'::jsonb) from public.forecast_options x where x.event_id=e.id),
    'forecast',case when f.id is null then null else jsonb_build_object('id',f.id,'event_id',f.event_id,'selected_option_id',f.selected_option_id,'probability',f.probability,'reasoning',f.reasoning,'domain_version',f.domain_version,'created_at',f.created_at,'updated_at',f.updated_at) end,
    'outcome',case when o.id is null then null else jsonb_build_object('id',o.id,'event_id',o.event_id,'resolved_option_id',o.resolved_option_id,'resolved_at',o.resolved_at,'source_reference',o.source_reference,'source_type',o.source_type,'resolution_note',o.resolution_note,'resolver_status',o.resolver_status,'domain_version',o.domain_version) end,
    'server_timestamp',server_time,'authentication_required',uid is null,'submission_permitted',reason is null,'locked',reason is not null,'lock_reason',reason);
end $$;

create function public.get_forecast_resolution_workspace(input_event_id text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare e public.forecast_events%rowtype; o public.forecast_outcomes%rowtype; uid uuid:=auth.uid(); server_time timestamptz:=clock_timestamp(); authorized boolean:=false; reason text;
begin
  authorized := uid is not null and exists(select 1 from public.forecast_resolvers r where r.user_id=uid);
  select * into e from public.forecast_events where id=input_event_id;
  if found and e.status='resolved' then select * into o from public.forecast_outcomes where event_id=e.id and resolver_status='verified'; end if;
  reason := case when uid is null then 'not_authenticated' when not authorized then 'resolver_not_authorized' when e.id is null then 'event_not_found' when e.status='cancelled' then 'event_cancelled' when e.status='resolved' or o.id is not null then 'outcome_already_resolved' when server_time < e.closes_at then 'forecast_still_open' when server_time < coalesce(e.resolves_at,e.resolution_window_starts_at) then 'resolution_time_not_reached' else null end;
  return jsonb_build_object(
    'event',case when e.id is null then null else jsonb_build_object('id',e.id,'title',e.title,'short_description',e.short_description,'category',e.category,'city_id',e.city_id,'geographic_scope',e.geographic_scope,'opens_at',e.opens_at,'closes_at',e.closes_at,'resolves_at',e.resolves_at,'resolution_window_starts_at',e.resolution_window_starts_at,'resolution_window_ends_at',e.resolution_window_ends_at,'status',e.status,'resolution_source',e.resolution_source,'is_demo',e.is_demo,'domain_version',e.domain_version,'created_at',e.created_at) end,
    'options',case when e.id is null then '[]'::jsonb else (select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'label',x.label,'description',x.description) order by x.sort_order),'[]'::jsonb) from public.forecast_options x where x.event_id=e.id) end,
    'outcome',case when o.id is null then null else jsonb_build_object('id',o.id,'event_id',o.event_id,'resolved_option_id',o.resolved_option_id,'resolved_at',o.resolved_at,'source_reference',o.source_reference,'source_type',o.source_type,'resolution_note',o.resolution_note,'resolver_status',o.resolver_status,'domain_version',o.domain_version) end,
    'server_timestamp',server_time,'authorized',authorized,'can_resolve',reason is null,'block_reason',reason);
end $$;

create function public.resolve_forecast_event(input_event_id text,input_resolved_option_id text,input_source_reference text,input_resolution_note text,input_domain_version text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid:=auth.uid(); e public.forecast_events%rowtype; o public.forecast_outcomes%rowtype; server_time timestamptz; clean_source text:=trim(input_source_reference); clean_note text:=trim(input_resolution_note);
begin
  if uid is null then raise exception using message='not_authenticated'; end if;
  if not exists(select 1 from public.forecast_resolvers r where r.user_id=uid) then raise exception using message='forecast_resolver_not_authorized'; end if;
  select * into e from public.forecast_events where id=input_event_id for update;
  if not found then raise exception using message='forecast_event_not_found'; end if;
  server_time:=clock_timestamp();
  if input_domain_version is distinct from 'forecast-domain-v1' then raise exception using message='unsupported_forecast_version'; end if;
  if e.status='cancelled' then raise exception using message='forecast_event_cancelled'; end if;
  if e.status='resolved' then raise exception using message='forecast_event_already_resolved'; end if;
  if exists(select 1 from public.forecast_outcomes x where x.event_id=e.id) then raise exception using message='forecast_outcome_already_exists'; end if;
  if server_time < e.closes_at then raise exception using message='forecast_event_still_open'; end if;
  if server_time < coalesce(e.resolves_at,e.resolution_window_starts_at) then raise exception using message='forecast_resolution_time_not_reached'; end if;
  if not exists(select 1 from public.forecast_options x where x.event_id=e.id and x.id=input_resolved_option_id) then raise exception using message='forecast_outcome_option_not_found'; end if;
  if clean_source is null or length(clean_source) not between 1 and 2000 then raise exception using message='invalid_source_reference'; end if;
  if clean_note is null or length(clean_note) not between 1 and 2000 then raise exception using message='invalid_resolution_note'; end if;
  begin
    insert into public.forecast_outcomes(event_id,resolved_option_id,resolved_at,source_reference,source_type,resolution_note,resolver_status,resolver_user_id,domain_version,created_at)
    values(e.id,input_resolved_option_id,server_time,clean_source,e.resolution_source,clean_note,'verified',uid,input_domain_version,server_time) returning * into o;
    update public.forecast_events set status='resolved',updated_at=server_time where id=e.id returning * into e;
  exception when unique_violation or foreign_key_violation or check_violation then raise exception using message='forecast_outcome_write_failed'; end;
  return jsonb_build_object(
    'outcome',jsonb_build_object('id',o.id,'event_id',o.event_id,'resolved_option_id',o.resolved_option_id,'resolved_at',o.resolved_at,'source_reference',o.source_reference,'source_type',o.source_type,'resolution_note',o.resolution_note,'resolver_status',o.resolver_status,'domain_version',o.domain_version),
    'event',jsonb_build_object('id',e.id,'title',e.title,'short_description',e.short_description,'category',e.category,'city_id',e.city_id,'geographic_scope',e.geographic_scope,'opens_at',e.opens_at,'closes_at',e.closes_at,'resolves_at',e.resolves_at,'resolution_window_starts_at',e.resolution_window_starts_at,'resolution_window_ends_at',e.resolution_window_ends_at,'status',e.status,'resolution_source',e.resolution_source,'is_demo',e.is_demo,'domain_version',e.domain_version,'created_at',e.created_at,'updated_at',e.updated_at),
    'options',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'label',x.label,'description',x.description) order by x.sort_order),'[]'::jsonb) from public.forecast_options x where x.event_id=e.id),
    'server_timestamp',server_time);
end $$;

revoke all on function public.get_forecast_workspace(text) from public;
revoke all on function public.get_forecast_resolution_workspace(text) from public;
revoke all on function public.resolve_forecast_event(text,text,text,text,text) from public;
grant execute on function public.get_forecast_workspace(text) to anon, authenticated;
grant execute on function public.get_forecast_resolution_workspace(text) to authenticated;
grant execute on function public.resolve_forecast_event(text,text,text,text,text) to authenticated;
