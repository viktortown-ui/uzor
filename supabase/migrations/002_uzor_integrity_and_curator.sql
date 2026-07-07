-- MVP 1.1 integrity hardening. Safe to run after 001.
create extension if not exists pgcrypto with schema extensions;

drop policy if exists own_contrib_insert on public.contributions;
drop policy if exists own_contrib_update on public.contributions;
drop policy if exists proposal_insert on public.candidate_proposals;
drop policy if exists curator_update_proposals on public.candidate_proposals;

create policy no_client_contrib_insert on public.contributions for insert to authenticated with check (false);
create policy no_client_contrib_update on public.contributions for update to authenticated using (false) with check (false);
create policy no_client_contrib_delete on public.contributions for delete to authenticated using (false);
create policy no_client_proposal_insert on public.candidate_proposals for insert to authenticated with check (false);
create policy no_client_proposal_update on public.candidate_proposals for update to authenticated using (false) with check (false);
create policy no_client_proposal_delete on public.candidate_proposals for delete to authenticated using (false);

create or replace function public.join_circle_by_code(input_code text)
returns table(circle_id uuid,circle_name text,circle_context text,theme_id uuid,theme_title text,theme_subtitle text)
language plpgsql security definer set search_path='public, extensions' as $$
declare normalized text; found public.circles%rowtype; active_theme public.themes%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  normalized := upper(trim(coalesce(input_code,'')));
  if normalized !~ '^[A-Z0-9_-]{16,120}$' then return; end if;
  select * into found from public.circles c where c.invite_code_hash=encode(extensions.digest(normalized,'sha256'),'hex') limit 1;
  if found.id is null then return; end if;
  insert into public.circle_memberships(circle_id,user_id) values(found.id,auth.uid()) on conflict do nothing;
  select * into active_theme from public.themes t where t.circle_id=found.id and t.is_active order by t.created_at limit 1;
  return query select found.id,found.name,found.context,active_theme.id,active_theme.title,active_theme.subtitle;
end;$$;

create or replace function public.upsert_contribution(input_theme_id uuid,input_layer text,input_signal_id uuid,input_group_id uuid,input_consequence_id uuid,input_evidence text,input_intensity text)
returns uuid language plpgsql security definer set search_path='public' as $$
declare c_id uuid; out_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select circle_id into c_id from public.themes where id=input_theme_id and is_active;
  if c_id is null or not public.is_member(c_id) then raise exception 'not allowed'; end if;
  if input_layer not in ('tension','support','potential') or input_evidence not in ('experienced','observed') or input_intensity not in ('low','medium','high') then raise exception 'bad input'; end if;
  if not exists(select 1 from public.catalog_items where id=input_signal_id and theme_id=input_theme_id and kind='signal' and layer=input_layer and is_active) then raise exception 'bad signal'; end if;
  if not exists(select 1 from public.catalog_items where id=input_group_id and theme_id=input_theme_id and kind='group' and is_active) then raise exception 'bad group'; end if;
  if not exists(select 1 from public.catalog_items where id=input_consequence_id and theme_id=input_theme_id and kind='consequence' and is_active) then raise exception 'bad consequence'; end if;
  insert into public.contributions(circle_id,theme_id,user_id,layer,signal_id,group_id,consequence_id,evidence,intensity)
  values(c_id,input_theme_id,auth.uid(),input_layer,input_signal_id,input_group_id,input_consequence_id,input_evidence,input_intensity)
  on conflict(circle_id,theme_id,user_id,layer,signal_id,group_id,consequence_id) do update set evidence=excluded.evidence,intensity=excluded.intensity,updated_at=now()
  returning id into out_id;
  return out_id;
end;$$;

create or replace function public.submit_candidate_proposal(input_theme_id uuid,input_layer text,input_kind text,raw_text text)
returns uuid language plpgsql security definer set search_path='public' as $$
declare c_id uuid; out_id uuid; clean text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  clean := trim(coalesce(raw_text,''));
  select circle_id into c_id from public.themes where id=input_theme_id and is_active;
  if c_id is null or not public.is_member(c_id) then raise exception 'not allowed'; end if;
  if input_layer not in ('tension','support','potential') or input_kind not in ('signal','consequence') or char_length(clean) not between 1 and 80 then raise exception 'bad input'; end if;
  insert into public.candidate_proposals(circle_id,theme_id,author_id,layer,proposal_kind,raw_text) values(c_id,input_theme_id,auth.uid(),input_layer,input_kind,clean) returning id into out_id;
  return out_id;
end;$$;

create or replace function public.review_candidate_proposal(input_proposal_id uuid,decision text,approved_label text,approved_kind text,approved_layer text)
returns uuid language plpgsql security definer set search_path='public' as $$
declare p public.candidate_proposals%rowtype; item_id uuid; clean text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into p from public.candidate_proposals where id=input_proposal_id and status='pending' for update;
  if p.id is null or not public.is_curator(p.circle_id) then raise exception 'not allowed'; end if;
  if decision = 'approved' then
    clean := trim(coalesce(approved_label,''));
    if approved_kind not in ('signal','consequence') or approved_layer not in ('tension','support','potential') or char_length(clean) not between 1 and 80 then raise exception 'bad approval'; end if;
    insert into public.catalog_items(theme_id,kind,layer,label,sort_order,is_active) values(p.theme_id,approved_kind,case when approved_kind='signal' then approved_layer else null end,clean,100,true) returning id into item_id;
    update public.candidate_proposals set status='approved', reviewed_at=now(), reviewed_by=auth.uid() where id=p.id;
  elsif decision = 'rejected' then
    update public.candidate_proposals set status='rejected', reviewed_at=now(), reviewed_by=auth.uid() where id=p.id;
  else raise exception 'bad decision';
  end if;
  return item_id;
end;$$;

create or replace function public.get_theme_snapshot(input_theme_id uuid) returns jsonb language sql stable security definer set search_path='public' as $$
with allowed as (select t.circle_id from public.themes t where t.id=input_theme_id and public.is_member(t.circle_id)),
rows as (select c.* from public.contributions c, allowed where c.theme_id=input_theme_id),
branch_rows as (select layer,signal_id,consequence_id,count(distinct user_id) participants,count(distinct group_id) distinct_groups,count(distinct evidence) evidence_types,sum((case evidence when 'experienced' then 1.0 else 0.6 end)*(case intensity when 'low' then .75 when 'medium' then 1.0 else 1.35 end)*exp(-ln(2)*greatest(0,extract(epoch from now()-updated_at)/86400)/21)) effective from rows group by 1,2,3),
group_rows as (select layer,signal_id,consequence_id,group_id,count(distinct user_id) participants,sum((case evidence when 'experienced' then 1.0 else 0.6 end)*(case intensity when 'low' then .75 when 'medium' then 1.0 else 1.35 end)) strength from rows group by 1,2,3,4),
divergence as (select layer,signal_id,count(*) filter(where participants >= 3) strong_count from branch_rows group by 1,2),
enriched as (select b.*,ln(1+effective)*(1+least(.30,.08*(distinct_groups-1))) strength,least(1,.18*sqrt(participants)+.14*sqrt(distinct_groups)+.10*(case when evidence_types>1 then 1 else .5 end)) clarity,coalesce(d.strong_count,0) >= 2 is_divergence from branch_rows b left join divergence d using(layer,signal_id)),
branches_json as (select coalesce(jsonb_agg(jsonb_build_object('layer',e.layer,'signalId',e.signal_id,'consequenceId',e.consequence_id,'participantCount',e.participants,'distinctGroups',e.distinct_groups,'groupBreakdown',(select coalesce(jsonb_agg(jsonb_build_object('groupId',g.group_id,'participantCount',g.participants,'strength',g.strength) order by g.strength desc),'[]'::jsonb) from group_rows g where g.layer=e.layer and g.signal_id=e.signal_id and g.consequence_id=e.consequence_id),'evidenceDiversity',case when e.evidence_types>1 then 1 else .5 end,'strength',e.strength,'clarity',e.clarity,'status',case when e.clarity<.35 or e.participants<2 then 'fog' when e.clarity<.65 then 'emerging' else 'confirmed' end,'isDivergence',e.is_divergence)),'[]'::jsonb) branches from enriched e)
select jsonb_build_object('participantCount',(select count(distinct user_id) from rows),'branchCount',(select count(*) from enriched),'clarity',coalesce((select avg(clarity) from enriched),0),'branches',(select branches from branches_json),'convergence',(select coalesce(jsonb_agg(jsonb_build_object('consequenceId',consequence_id,'influence',sum_strength)),'[]'::jsonb) from (select consequence_id,sum(strength) sum_strength from enriched group by consequence_id order by sum_strength desc) c));
$$;

revoke all on function public.submit_candidate_proposal(uuid,text,text,text) from public;
revoke all on function public.review_candidate_proposal(uuid,text,text,text,text) from public;
grant execute on function public.join_circle_by_code(text), public.get_theme_snapshot(uuid), public.upsert_contribution(uuid,text,uuid,uuid,uuid,text,text), public.submit_candidate_proposal(uuid,text,text,text), public.review_candidate_proposal(uuid,text,text,text,text) to authenticated;
