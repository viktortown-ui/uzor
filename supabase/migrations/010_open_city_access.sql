-- Open-city access. If automatic binding is ambiguous, an owner must explicitly run:
-- insert into public.open_city_circles(city_slug,circle_id,is_open) values ('perm','<existing-circle-uuid>',true)
-- on conflict(city_slug) do update set circle_id=excluded.circle_id,is_open=true;
create table if not exists public.open_city_circles(
  city_slug text primary key check(city_slug=lower(city_slug) and city_slug~'^[a-z0-9-]+$'),
  circle_id uuid not null unique references public.circles(id) on delete restrict,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.open_city_circles enable row level security;

do $$
declare eligible_count integer; eligible_circle uuid;
begin
  if not exists(select 1 from public.open_city_circles where city_slug='perm') then
    select count(*), min(id) into eligible_count, eligible_circle from public.circles;
    if eligible_count=1 then
      insert into public.open_city_circles(city_slug,circle_id) values('perm',eligible_circle) on conflict do nothing;
    else
      raise notice 'UZOR OWNER ACTION: bind the existing Perm circle to open_city_circles; % eligible circles found.',eligible_count;
    end if;
  end if;
end $$;

create or replace function public.ensure_open_city_membership(input_city_slug text)
returns table(city_slug text,circle_id uuid,role text)
language plpgsql security definer set search_path=''
as $$
declare caller uuid:=auth.uid(); mapped uuid;
begin
  if caller is null then raise exception using errcode='42501',message='authentication required'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception using errcode='42501',message='real account required'; end if;
  select m.circle_id into mapped from public.open_city_circles m where m.city_slug=lower(trim(input_city_slug)) and m.is_open;
  if mapped is null then raise exception using errcode='42501',message='open city unavailable'; end if;
  insert into public.circle_memberships(circle_id,user_id,role) values(mapped,caller,'participant') on conflict(circle_id,user_id) do nothing;
  return query select lower(trim(input_city_slug)),mapped,cm.role from public.circle_memberships cm where cm.circle_id=mapped and cm.user_id=caller;
end $$;
revoke all on function public.ensure_open_city_membership(text) from public;
grant execute on function public.ensure_open_city_membership(text) to authenticated;
comment on table public.open_city_circles is 'Owner-controlled mapping from a public city slug to one existing circle; contains no invite code.';
