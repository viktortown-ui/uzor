-- HOTFIX 1.2: safe browser read path through SECURITY DEFINER RPCs.
-- Safe to run after 002. Does not recreate tables or delete data.

revoke all on function public.get_theme_snapshot(uuid) from public;

drop function if exists public.get_my_active_theme();
create function public.get_my_active_theme()
returns table(id uuid, circle_id uuid, title text, subtitle text)
language sql stable security definer set search_path='public' as $$
  select t.id, t.circle_id, t.title, t.subtitle
  from public.themes t
  join public.circle_memberships m on m.circle_id = t.circle_id
  where m.user_id = auth.uid()
    and t.is_active
  order by m.joined_at desc, t.created_at desc
  limit 1;
$$;

drop function if exists public.get_theme_catalog(uuid);
create function public.get_theme_catalog(input_theme_id uuid)
returns table(id uuid, kind text, layer text, label text, sort_order int)
language sql stable security definer set search_path='public' as $$
  select ci.id, ci.kind, ci.layer, ci.label, ci.sort_order
  from public.catalog_items ci
  join public.themes t on t.id = ci.theme_id
  join public.circle_memberships m on m.circle_id = t.circle_id and m.user_id = auth.uid()
  where ci.theme_id = input_theme_id
    and ci.is_active
    and t.is_active
  order by ci.sort_order, ci.label;
$$;

create or replace function public.get_theme_snapshot(input_theme_id uuid)
returns jsonb
language plpgsql stable security definer set search_path='public' as $$
declare
  c_id uuid;
  result jsonb;
begin
  select t.circle_id into c_id from public.themes t where t.id = input_theme_id and t.is_active;
  if c_id is null or not public.is_member(c_id) then
    raise exception 'not allowed';
  end if;

  with rows as (
    select c.* from public.contributions c where c.theme_id = input_theme_id and c.circle_id = c_id
  ),
  branch_rows as (
    select layer, signal_id, consequence_id,
           count(distinct user_id) participants,
           count(distinct group_id) distinct_groups,
           count(distinct evidence) evidence_types,
           sum((case evidence when 'experienced' then 1.0 else 0.6 end) *
               (case intensity when 'low' then .75 when 'medium' then 1.0 else 1.35 end) *
               exp(-ln(2) * greatest(0, extract(epoch from now() - updated_at) / 86400) / 21)) effective
    from rows group by 1,2,3
  ),
  group_rows as (
    select layer, signal_id, consequence_id, group_id,
           count(distinct user_id) participants,
           sum((case evidence when 'experienced' then 1.0 else 0.6 end) *
               (case intensity when 'low' then .75 when 'medium' then 1.0 else 1.35 end)) strength
    from rows group by 1,2,3,4
  ),
  divergence as (
    select layer, signal_id, count(*) filter(where participants >= 3) strong_count
    from branch_rows group by 1,2
  ),
  enriched as (
    select b.*,
           ln(1 + effective) * (1 + least(.30, .08 * (distinct_groups - 1))) strength,
           least(1, .18 * sqrt(participants) + .14 * sqrt(distinct_groups) + .10 * (case when evidence_types > 1 then 1 else .5 end)) clarity,
           coalesce(d.strong_count, 0) >= 2 is_divergence
    from branch_rows b left join divergence d using(layer, signal_id)
  ),
  branches_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.layer || ':' || e.signal_id || ':' || e.consequence_id,
      'layer', e.layer,
      'signalId', e.signal_id,
      'consequenceId', e.consequence_id,
      'participantCount', e.participants,
      'distinctGroups', e.distinct_groups,
      'dominantGroups', (select coalesce(jsonb_agg(g.group_id order by g.strength desc), '[]'::jsonb) from group_rows g where g.layer=e.layer and g.signal_id=e.signal_id and g.consequence_id=e.consequence_id),
      'groupBreakdown', (select coalesce(jsonb_agg(jsonb_build_object('groupId', g.group_id, 'participantCount', g.participants, 'strength', g.strength) order by g.strength desc), '[]'::jsonb) from group_rows g where g.layer=e.layer and g.signal_id=e.signal_id and g.consequence_id=e.consequence_id),
      'evidenceDiversity', case when e.evidence_types > 1 then 1 else .5 end,
      'strength', e.strength,
      'clarity', e.clarity,
      'status', case when e.clarity < .35 or e.participants < 2 then 'fog' when e.clarity < .65 then 'emerging' else 'confirmed' end,
      'tensionScore', case when e.layer = 'tension' then e.strength else 0 end,
      'supportScore', case when e.layer = 'support' then e.strength else 0 end,
      'potentialScore', case when e.layer = 'potential' then e.strength else 0 end,
      'isDivergence', e.is_divergence
    ) order by e.strength desc), '[]'::jsonb) branches
    from enriched e
  )
  select jsonb_build_object(
    'participantCount', (select count(distinct user_id) from rows),
    'branchCount', (select count(*) from enriched),
    'threadCount', (select count(*) from enriched),
    'branches', (select branches from branches_json),
    'convergence', (select coalesce(jsonb_agg(jsonb_build_object('consequenceId', consequence_id, 'influence', sum_strength) order by sum_strength desc), '[]'::jsonb) from (select consequence_id, sum(strength) sum_strength from enriched group by consequence_id) c),
    'clarity', coalesce((select avg(clarity) from enriched), 0)
  ) into result;

  return coalesce(result, jsonb_build_object('participantCount',0,'branchCount',0,'threadCount',0,'branches','[]'::jsonb,'convergence','[]'::jsonb,'clarity',0));
end;
$$;

revoke all on function public.get_my_active_theme() from public;
revoke all on function public.get_theme_catalog(uuid) from public;
revoke all on function public.get_theme_snapshot(uuid) from public;
grant execute on function public.get_my_active_theme(), public.get_theme_catalog(uuid), public.get_theme_snapshot(uuid) to authenticated;
