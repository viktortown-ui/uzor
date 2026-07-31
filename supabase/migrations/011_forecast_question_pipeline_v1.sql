-- Experimental future-question proposal and editorial pipeline v1.
create table public.forecast_question_editors(
 user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null, note text check(note is null or char_length(note)<=500)
);
create table public.forecast_question_proposals(
 id uuid primary key default gen_random_uuid(), author_user_id uuid not null references auth.users(id) on delete cascade,
 circle_id uuid not null references public.circles(id) on delete restrict, city_id uuid not null references public.delta_cities(id) on delete restrict,
 linked_delta_id uuid references public.deltas(id) on delete set null, raw_question text not null check(char_length(trim(raw_question)) between 10 and 280),
 why_it_matters text check(why_it_matters is null or char_length(why_it_matters)<=800), location_label text check(location_label is null or char_length(location_label)<=160),
 suggested_source_reference text check(suggested_source_reference is null or char_length(suggested_source_reference)<=2000), suggested_deadline timestamptz,
 public_title text check(public_title is null or char_length(public_title)<=280), public_summary text check(public_summary is null or char_length(public_summary)<=800),
 public_decision_note text check(public_decision_note is null or char_length(public_decision_note)<=1000), editor_user_id uuid references auth.users(id) on delete restrict,
 status text not null default 'submitted' check(status in('submitted','in_review','needs_clarification','public_review','selected','converted','rejected','archived')),
 converted_event_id text references public.forecast_events(id) on delete set null, public_review_started_at timestamptz, selected_at timestamptz, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(converted_event_id is null or status='converted'), check(status not in('public_review','selected') or (nullif(trim(public_title),'') is not null and nullif(trim(public_summary),'') is not null)),
 check(status='submitted' or editor_user_id is not null)
);
create table public.forecast_question_proposal_options(proposal_id uuid not null references public.forecast_question_proposals(id) on delete cascade,sort_order smallint not null check(sort_order between 1 and 6),option_text text not null check(char_length(trim(option_text)) between 1 and 120),created_at timestamptz not null default now(),primary key(proposal_id,sort_order));
create table public.forecast_question_consideration_votes(proposal_id uuid not null references public.forecast_question_proposals(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,vote text not null check(vote in('support','not_now')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(proposal_id,user_id));
create index forecast_question_proposals_author_created_idx on public.forecast_question_proposals(author_user_id,created_at desc);
create index forecast_question_proposals_city_status_review_idx on public.forecast_question_proposals(city_id,status,public_review_started_at desc);
create index forecast_question_proposals_status_created_idx on public.forecast_question_proposals(status,created_at desc);

alter table public.forecast_question_editors enable row level security; alter table public.forecast_question_proposals enable row level security; alter table public.forecast_question_proposal_options enable row level security; alter table public.forecast_question_consideration_votes enable row level security;
revoke all on public.forecast_question_editors,public.forecast_question_proposals,public.forecast_question_proposal_options,public.forecast_question_consideration_votes from anon,authenticated;

create function public.submit_forecast_question_proposal(input_city_slug text,input_raw_question text,input_why_it_matters text,input_location_label text,input_linked_delta_id uuid,input_suggested_options text[],input_suggested_source_reference text,input_suggested_deadline timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; city uuid; p public.forecast_question_proposals; opts text[]; d record;
begin
 if u is null then raise exception 'not_authenticated'; end if; if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'anonymous_identity'; end if;
 select o.circle_id,dc.id into c,city from public.open_city_circles o join public.delta_cities dc on dc.slug=o.city_slug and dc.is_active where o.city_slug=lower(trim(input_city_slug)) and o.is_open;
 if c is null or not public.is_member(c) then raise exception 'not_circle_member'; end if;
 if input_linked_delta_id is not null then select circle_id,city_id into d from public.deltas where id=input_linked_delta_id; if not found or d.circle_id is distinct from c or d.city_id is distinct from city then raise exception 'invalid_linked_delta'; end if; end if;
 select coalesce(array_agg(trim(x) order by n),'{}') into opts from unnest(coalesce(input_suggested_options,'{}')) with ordinality q(x,n) where trim(x)<>'';
 if cardinality(opts)>6 then raise exception 'too_many_options'; end if;
 if (select count(*)<>count(distinct lower(x)) from unnest(opts)x) then raise exception 'duplicate_options'; end if;
 insert into public.forecast_question_proposals(author_user_id,circle_id,city_id,linked_delta_id,raw_question,why_it_matters,location_label,suggested_source_reference,suggested_deadline)
 values(u,c,city,input_linked_delta_id,trim(input_raw_question),nullif(trim(coalesce(input_why_it_matters,'')),''),nullif(trim(coalesce(input_location_label,'')),''),nullif(trim(coalesce(input_suggested_source_reference,'')),''),input_suggested_deadline) returning * into p;
 insert into public.forecast_question_proposal_options select p.id,n,x,now() from unnest(opts) with ordinality q(x,n);
 return jsonb_build_object(
  'id',p.id,'rawQuestion',p.raw_question,'publicTitle',null,'publicSummary',null,
  'status',p.status,'publicDecisionNote',null,'createdAt',p.created_at,'updatedAt',p.updated_at,
  'linkedDeltaId',p.linked_delta_id,'suggestedDeadline',p.suggested_deadline,'suggestedOptions',to_jsonb(opts)
 );
end$$;
create function public.get_my_forecast_question_proposals(input_city_slug text,input_limit integer default 30) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select p.id,p.raw_question "rawQuestion",p.public_title "publicTitle",p.public_summary "publicSummary",p.status,p.public_decision_note "publicDecisionNote",p.created_at "createdAt",p.updated_at "updatedAt",p.linked_delta_id "linkedDeltaId",p.suggested_deadline "suggestedDeadline",coalesce((select jsonb_agg(o.option_text order by o.sort_order) from public.forecast_question_proposal_options o where o.proposal_id=p.id),'[]') "suggestedOptions" from public.forecast_question_proposals p join public.delta_cities c on c.id=p.city_id where p.author_user_id=auth.uid() and c.slug=lower(trim(input_city_slug)) order by p.created_at desc limit least(100,greatest(1,coalesce(input_limit,30))))x $$;
create function public.list_public_forecast_question_proposals(input_city_slug text,input_limit integer default 30,input_offset integer default 0) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select p.id,p.public_title "publicTitle",p.public_summary "publicSummary",p.location_label "locationLabel",p.linked_delta_id "linkedDeltaId",p.status,p.public_review_started_at "publicReviewStartedAt",count(v.*)filter(where v.vote='support')::int "supportCount",count(v.*)filter(where v.vote='not_now')::int "notNowCount",count(v.*)::int "totalVotes",max(v.vote)filter(where v.user_id=auth.uid()) "viewerVote",p.created_at "createdAt",p.selected_at "selectedAt" from public.forecast_question_proposals p join public.delta_cities c on c.id=p.city_id join public.open_city_circles oc on oc.city_slug=c.slug and oc.circle_id=p.circle_id and oc.is_open left join public.forecast_question_consideration_votes v on v.proposal_id=p.id where c.slug=lower(trim(input_city_slug)) and p.status in('public_review','selected') group by p.id order by p.public_review_started_at desc nulls last limit least(100,greatest(1,coalesce(input_limit,30))) offset greatest(0,coalesce(input_offset,0)))x $$;
create function public.vote_forecast_question_consideration(input_proposal_id uuid,input_vote text) returns jsonb language plpgsql security definer set search_path='' as $$ declare u uuid:=auth.uid();p public.forecast_question_proposals;begin if u is null then raise exception 'not_authenticated';end if;if coalesce((auth.jwt()->>'is_anonymous')::boolean,false)then raise exception 'anonymous_identity';end if;if input_vote not in('support','not_now')then raise exception 'invalid_vote';end if;select * into p from public.forecast_question_proposals where id=input_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;if p.status<>'public_review'then raise exception 'voting_closed';end if;if not public.is_member(p.circle_id)then raise exception 'not_circle_member';end if;insert into public.forecast_question_consideration_votes values(p.id,u,input_vote,now(),now())on conflict(proposal_id,user_id)do update set vote=excluded.vote,updated_at=now();return(select jsonb_build_object('proposalId',p.id,'supportCount',count(*)filter(where vote='support'),'notNowCount',count(*)filter(where vote='not_now'),'totalVotes',count(*),'viewerVote',input_vote)from public.forecast_question_consideration_votes where proposal_id=p.id);end$$;
create function public.get_forecast_question_editor_access()returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('authenticated',auth.uid() is not null,'authorized',exists(select 1 from public.forecast_question_editors where user_id=auth.uid()))$$;
create function public.get_forecast_question_editor_queue(input_status text default null,input_limit integer default 100)returns jsonb language plpgsql security definer set search_path='' as $$begin if not exists(select 1 from public.forecast_question_editors where user_id=auth.uid())then raise exception 'editor_not_authorized';end if;return(select coalesce(jsonb_agg(to_jsonb(x)),'[]')from(select p.id,p.author_user_id "authorUserId",p.raw_question "rawQuestion",p.why_it_matters "whyItMatters",p.location_label "locationLabel",p.suggested_source_reference "suggestedSourceReference",p.suggested_deadline "suggestedDeadline",p.linked_delta_id "linkedDeltaId",p.public_title "publicTitle",p.public_summary "publicSummary",p.public_decision_note "publicDecisionNote",p.status,p.created_at "createdAt",p.updated_at "updatedAt",p.reviewed_at "reviewedAt",p.public_review_started_at "publicReviewStartedAt",p.selected_at "selectedAt",coalesce((select jsonb_agg(o.option_text order by o.sort_order)from public.forecast_question_proposal_options o where o.proposal_id=p.id),'[]')"suggestedOptions",count(v.*)filter(where v.vote='support')::int "supportCount",count(v.*)filter(where v.vote='not_now')::int "notNowCount",count(v.*)::int "totalVotes" from public.forecast_question_proposals p left join public.forecast_question_consideration_votes v on v.proposal_id=p.id where input_status is null or p.status=input_status group by p.id order by p.created_at desc limit least(200,greatest(1,coalesce(input_limit,100))))x);end$$;
create function public.moderate_forecast_question_proposal(
 input_proposal_id uuid,input_action text,input_public_title text,
 input_public_summary text,input_public_decision_note text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 p public.forecast_question_proposals;
 next_status text;
 server_now timestamptz := now();
begin
 if not exists(select 1 from public.forecast_question_editors where user_id=auth.uid()) then
  raise exception 'editor_not_authorized';
 end if;
 select * into p from public.forecast_question_proposals where id=input_proposal_id for update;
 if not found then raise exception 'proposal_not_found'; end if;
 next_status := case input_action
  when 'start_review' then 'in_review' when 'request_clarification' then 'needs_clarification'
  when 'open_public_review' then 'public_review' when 'select' then 'selected'
  when 'reject' then 'rejected' when 'archive' then 'archived'
  when 'return_to_review' then 'in_review' end;
 if next_status is null or not (
  (p.status='submitted' and next_status='in_review') or
  (p.status='in_review' and next_status in('needs_clarification','public_review','rejected','archived')) or
  (p.status='needs_clarification' and next_status in('in_review','rejected','archived')) or
  (p.status='public_review' and next_status in('selected','in_review','archived')) or
  (p.status='selected' and next_status in('in_review','archived'))
 ) then raise exception 'invalid_transition'; end if;
 if next_status in('public_review','selected') and (
  nullif(trim(coalesce(input_public_title,p.public_title,'')),'') is null or
  nullif(trim(coalesce(input_public_summary,p.public_summary,'')),'') is null
 ) then raise exception 'public_content_required'; end if;
 if input_action in('request_clarification','reject') and nullif(trim(coalesce(input_public_decision_note,'')),'') is null then
  raise exception 'decision_note_required';
 end if;
 if p.status in('public_review','selected') and next_status='in_review' then
  delete from public.forecast_question_consideration_votes where proposal_id=p.id;
 end if;
 update public.forecast_question_proposals set
  status=next_status, public_title=coalesce(nullif(trim(input_public_title),''),public_title),
  public_summary=coalesce(nullif(trim(input_public_summary),''),public_summary),
  public_decision_note=nullif(trim(coalesce(input_public_decision_note,'')),''),
  editor_user_id=auth.uid(), reviewed_at=server_now, updated_at=server_now,
  public_review_started_at=case when next_status='public_review' then server_now when p.status in('public_review','selected') and next_status='in_review' then null else p.public_review_started_at end,
  selected_at=case when next_status='selected' then server_now when next_status='in_review' then null else p.selected_at end,
  converted_event_id=null
 where id=p.id returning * into p;
 return (select to_jsonb(x) from (
  select p.id,p.author_user_id "authorUserId",p.raw_question "rawQuestion",p.why_it_matters "whyItMatters",
   p.location_label "locationLabel",p.suggested_source_reference "suggestedSourceReference",p.suggested_deadline "suggestedDeadline",
   p.linked_delta_id "linkedDeltaId",p.public_title "publicTitle",p.public_summary "publicSummary",
   p.public_decision_note "publicDecisionNote",p.status,p.created_at "createdAt",p.updated_at "updatedAt",
   p.reviewed_at "reviewedAt",p.public_review_started_at "publicReviewStartedAt",p.selected_at "selectedAt",
   coalesce((select jsonb_agg(o.option_text order by o.sort_order) from public.forecast_question_proposal_options o where o.proposal_id=p.id),'[]') "suggestedOptions",
   (select count(*)::int from public.forecast_question_consideration_votes v where v.proposal_id=p.id and v.vote='support') "supportCount",
   (select count(*)::int from public.forecast_question_consideration_votes v where v.proposal_id=p.id and v.vote='not_now') "notNowCount",
   (select count(*)::int from public.forecast_question_consideration_votes v where v.proposal_id=p.id) "totalVotes"
 ) x);
end $$;
revoke all on function public.submit_forecast_question_proposal(text,text,text,text,uuid,text[],text,timestamptz),public.get_my_forecast_question_proposals(text,integer),public.list_public_forecast_question_proposals(text,integer,integer),public.vote_forecast_question_consideration(uuid,text),public.get_forecast_question_editor_access(),public.get_forecast_question_editor_queue(text,integer),public.moderate_forecast_question_proposal(uuid,text,text,text,text) from public;
grant execute on function public.submit_forecast_question_proposal(text,text,text,text,uuid,text[],text,timestamptz),public.get_my_forecast_question_proposals(text,integer),public.vote_forecast_question_consideration(uuid,text),public.get_forecast_question_editor_access(),public.get_forecast_question_editor_queue(text,integer),public.moderate_forecast_question_proposal(uuid,text,text,text,text) to authenticated;
grant execute on function public.list_public_forecast_question_proposals(text,integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
