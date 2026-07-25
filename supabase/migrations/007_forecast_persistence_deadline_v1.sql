-- Forecast persistence v1. Deadlines are authorized exclusively by PostgreSQL time.
create table public.forecast_events (
  id text primary key, title text not null, short_description text not null, category text not null,
  city_id text, geographic_scope text, opens_at timestamptz not null, closes_at timestamptz not null,
  resolves_at timestamptz, resolution_window_starts_at timestamptz, resolution_window_ends_at timestamptz,
  status text not null, resolution_source text not null, is_demo boolean not null default false,
  domain_version text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint forecast_events_window check (opens_at < closes_at),
  constraint forecast_events_version check (domain_version = 'forecast-domain-v1'),
  constraint forecast_events_status check (status in ('draft','open','closed','awaiting-outcome','resolved','cancelled')),
  constraint forecast_events_source check (resolution_source in ('official-publication','municipal-service','retailer-publication','event-organizer','other-reference')),
  constraint forecast_events_resolution_definition check (
    (resolves_at is not null and resolution_window_starts_at is null and resolution_window_ends_at is null) or
    (resolves_at is null and resolution_window_starts_at is not null and resolution_window_ends_at is not null)
  ),
  constraint forecast_events_resolution_order check (
    (resolves_at is not null and resolves_at > closes_at) or
    (resolution_window_starts_at > closes_at and resolution_window_starts_at < resolution_window_ends_at)
  )
);

create table public.forecast_options (
  event_id text not null references public.forecast_events(id) on delete cascade, id text not null,
  label text not null, description text, sort_order integer not null, created_at timestamptz not null default now(),
  primary key(event_id,id), unique(event_id,sort_order),
  constraint forecast_options_id_nonempty check (length(trim(id)) > 0),
  constraint forecast_options_label_nonempty check (length(trim(label)) > 0)
);

create table public.user_forecasts (
  id uuid primary key default gen_random_uuid(), event_id text not null, user_id uuid not null references auth.users(id) on delete cascade,
  selected_option_id text not null, probability numeric not null, reasoning text, domain_version text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(event_id) references public.forecast_events(id) on delete cascade,
  foreign key(event_id,selected_option_id) references public.forecast_options(event_id,id),
  constraint user_forecasts_probability check (probability between 0 and 1),
  constraint user_forecasts_reasoning check (reasoning is null or length(reasoning) <= 280),
  constraint user_forecasts_version check (domain_version = 'forecast-domain-v1'), unique(event_id,user_id)
);

alter table public.forecast_events enable row level security;
alter table public.forecast_options enable row level security;
alter table public.user_forecasts enable row level security;
-- No table policies: access is only through the two narrowly granted security-definer functions.

insert into public.forecast_events(id,title,short_description,category,geographic_scope,opens_at,closes_at,resolves_at,status,resolution_source,is_demo,domain_version)
values ('sandbox-demo-milk-price-2026-12-15','Будет ли демо-цена продукта выше 120 ₽?','Условие: вымышленный продукт DEMO-MILK-1L, ровно 1 литр, в вымышленном публичном каталоге вымышленного магазина «ДемоМаркет-01» в 12:00 UTC 15 декабря 2026 года строго выше 120,00 ₽. Отсутствие цены означает, что исход не выше.','цены','вымышленный магазин «ДемоМаркет-01»','2026-07-25T00:00:00Z','2026-12-14T12:00:00Z','2026-12-15T12:00:00Z','open','retailer-publication',true,'forecast-domain-v1')
on conflict(id) do nothing;
insert into public.forecast_options(event_id,id,label,sort_order) values
('sandbox-demo-milk-price-2026-12-15','above','Строго выше 120,00 ₽',1),
('sandbox-demo-milk-price-2026-12-15','not-above','120,00 ₽ или ниже либо цена отсутствует',2)
on conflict(event_id,id) do nothing;

create function public.get_forecast_workspace(input_event_id text default 'sandbox-demo-milk-price-2026-12-15') returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare e public.forecast_events%rowtype; uid uuid := auth.uid(); f public.user_forecasts%rowtype; server_time timestamptz := clock_timestamp(); reason text;
begin
  select * into e from public.forecast_events where id=input_event_id;
  if not found then return jsonb_build_object('event',null,'options','[]'::jsonb,'forecast',null,'server_timestamp',server_time,'authentication_required',uid is null,'submission_permitted',false,'locked',true,'lock_reason','event_not_found'); end if;
  if uid is not null then select * into f from public.user_forecasts where event_id=e.id and user_id=uid; end if;
  reason := case when uid is null then 'not_authenticated' when e.status <> 'open' then 'event_not_open' when server_time < e.opens_at then 'before_open' when server_time >= e.closes_at then 'deadline_passed' else null end;
  return jsonb_build_object(
    'event',jsonb_build_object('id',e.id,'title',e.title,'short_description',e.short_description,'category',e.category,'city_id',e.city_id,'geographic_scope',e.geographic_scope,'opens_at',e.opens_at,'closes_at',e.closes_at,'resolves_at',e.resolves_at,'resolution_window_starts_at',e.resolution_window_starts_at,'resolution_window_ends_at',e.resolution_window_ends_at,'status',e.status,'resolution_source',e.resolution_source,'is_demo',e.is_demo,'domain_version',e.domain_version,'created_at',e.created_at),
    'options',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'description',o.description) order by o.sort_order),'[]'::jsonb) from public.forecast_options o where o.event_id=e.id),
    'forecast',case when f.id is null then null else jsonb_build_object('id',f.id,'event_id',f.event_id,'selected_option_id',f.selected_option_id,'probability',f.probability,'reasoning',f.reasoning,'domain_version',f.domain_version,'created_at',f.created_at,'updated_at',f.updated_at) end,
    'server_timestamp',server_time,'authentication_required',uid is null,'submission_permitted',reason is null,'locked',reason is not null,'lock_reason',reason);
end $$;

create function public.submit_forecast(input_event_id text,input_option_id text,input_probability numeric,input_reasoning text,input_domain_version text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid:=auth.uid(); e public.forecast_events%rowtype; f public.user_forecasts%rowtype; server_time timestamptz; clean_reason text:=nullif(trim(input_reasoning),''); created_result boolean; inserted boolean;
begin
  if uid is null then raise exception using message='not_authenticated'; end if;
  select * into e from public.forecast_events where id=input_event_id for share;
  if not found then raise exception using message='forecast_event_not_found'; end if;
  -- Capture time after the potentially blocking event-row lock, so deadline authorization cannot use a stale timestamp.
  server_time := clock_timestamp();
  if input_domain_version <> 'forecast-domain-v1' then raise exception using message='unsupported_forecast_version'; end if;
  if e.status <> 'open' then raise exception using message='forecast_event_not_open'; end if;
  if server_time < e.opens_at then raise exception using message='forecast_not_started'; end if;
  if server_time >= e.closes_at then raise exception using message='forecast_deadline_passed'; end if;
  if not exists(select 1 from public.forecast_options where event_id=e.id and id=input_option_id) then raise exception using message='forecast_option_not_found'; end if;
  if input_probability is null or input_probability = 'NaN'::numeric or input_probability < 0 or input_probability > 1 then raise exception using message='invalid_probability'; end if;
  if clean_reason is not null and length(clean_reason)>280 then raise exception using message='invalid_reasoning'; end if;
  insert into public.user_forecasts(event_id,user_id,selected_option_id,probability,reasoning,domain_version,created_at,updated_at)
  values(e.id,uid,input_option_id,input_probability,clean_reason,input_domain_version,server_time,server_time)
  on conflict(event_id,user_id) do nothing returning * into f;
  inserted := found;
  if inserted then
    created_result := true;
  else
    -- A conflicting concurrent insert is visible to this next command after ON CONFLICT has waited for it.
    -- Updating only mutable columns preserves the original id and created_at in the same function transaction.
    update public.user_forecasts set selected_option_id=input_option_id,probability=input_probability,reasoning=clean_reason,domain_version=input_domain_version,updated_at=server_time
    where event_id=e.id and user_id=uid returning * into f;
    if not found then raise exception using message='forecast_internal_write_conflict'; end if;
    created_result := false;
  end if;
  return jsonb_build_object('forecast',jsonb_build_object('id',f.id,'event_id',f.event_id,'selected_option_id',f.selected_option_id,'probability',f.probability,'reasoning',f.reasoning,'domain_version',f.domain_version,'created_at',f.created_at,'updated_at',f.updated_at),'server_timestamp',server_time,'event_deadline',e.closes_at,'created',created_result,'locked',false);
end $$;

revoke all on function public.get_forecast_workspace(text) from public;
revoke all on function public.submit_forecast(text,text,numeric,text,text) from public;
grant execute on function public.get_forecast_workspace(text) to anon, authenticated;
grant execute on function public.submit_forecast(text,text,numeric,text,text) to authenticated;
