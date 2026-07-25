\set ON_ERROR_STOP on

do $$ begin
 if not (select relrowsecurity from pg_class where oid='public.forecast_resolvers'::regclass) then raise exception 'resolver RLS disabled'; end if;
 if not (select relrowsecurity from pg_class where oid='public.forecast_outcomes'::regclass) then raise exception 'outcome RLS disabled'; end if;
 if has_table_privilege('authenticated','public.forecast_resolvers','select')
   or has_table_privilege('authenticated','public.forecast_outcomes','select')
   or has_table_privilege('authenticated','public.forecast_outcomes','insert')
   or has_table_privilege('authenticated','public.forecast_outcomes','update')
   or has_table_privilege('authenticated','public.forecast_outcomes','delete') then raise exception 'direct authenticated access exists'; end if;
end $$;

insert into auth.users(id) values ('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin perform count(*) from public.forecast_resolvers; raise exception 'resolver list readable'; exception when insufficient_privilege then null; end $$;
do $$ begin perform count(*) from public.forecast_outcomes; raise exception 'outcomes directly readable'; exception when insufficient_privilege then null; end $$;
reset role;

-- Every timing/lifecycle case owns an independent event in this fresh database.
insert into public.forecast_events(id,title,short_description,category,opens_at,closes_at,resolves_at,status,resolution_source,domain_version) values
 ('outcome-open','Open','Condition','test',clock_timestamp()-interval '2 days',clock_timestamp()+interval '1 hour',clock_timestamp()+interval '2 hours','open','official-publication','forecast-domain-v1'),
 ('outcome-future','Future','Condition','test',clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 hours',clock_timestamp()+interval '1 hour','awaiting-outcome','municipal-service','forecast-domain-v1'),
 ('outcome-cancelled','Cancelled','Condition','test',clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour','cancelled','other-reference','forecast-domain-v1'),
 ('outcome-valid','Valid','Condition','test',clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour','awaiting-outcome','retailer-publication','forecast-domain-v1');
insert into public.forecast_events(id,title,short_description,category,opens_at,closes_at,resolution_window_starts_at,resolution_window_ends_at,status,resolution_source,domain_version) values
 ('window-future','Window future','Condition','test',clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 hours',clock_timestamp()+interval '1 hour',clock_timestamp()+interval '2 hours','awaiting-outcome','event-organizer','forecast-domain-v1'),
 ('window-late','Window late','Condition','test',clock_timestamp()-interval '4 days',clock_timestamp()-interval '3 days',clock_timestamp()-interval '2 days',clock_timestamp()-interval '1 day','awaiting-outcome','event-organizer','forecast-domain-v1');
insert into public.forecast_options(event_id,id,label,sort_order)
select id,'yes','Yes',1 from public.forecast_events where id like 'outcome-%' or id like 'window-%';
insert into public.forecast_options(event_id,id,label,sort_order)
select id,'no','No',2 from public.forecast_events where id like 'outcome-%' or id like 'window-%';

set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222';
do $$ begin perform public.resolve_forecast_event('outcome-valid','yes','source','note','forecast-domain-v1'); raise exception 'unauthorized user resolved'; exception when others then if sqlerrm<>'forecast_resolver_not_authorized' then raise; end if; end $$;
insert into public.forecast_resolvers(user_id,note) values ('33333333-3333-3333-3333-333333333333','smoke resolver');
set request.jwt.claim.sub='33333333-3333-3333-3333-333333333333';
select 1/((public.get_forecast_resolution_workspace('outcome-valid')->>'authorized')::boolean::integer);

do $$ begin perform public.resolve_forecast_event('outcome-open','yes','source','note','forecast-domain-v1'); raise exception 'resolved before close'; exception when others then if sqlerrm<>'forecast_event_still_open' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-future','yes','source','note','forecast-domain-v1'); raise exception 'resolved before timestamp'; exception when others then if sqlerrm<>'forecast_resolution_time_not_reached' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('window-future','yes','source','note','forecast-domain-v1'); raise exception 'resolved before window'; exception when others then if sqlerrm<>'forecast_resolution_time_not_reached' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-cancelled','yes','source','note','forecast-domain-v1'); raise exception 'cancelled event resolved'; exception when others then if sqlerrm<>'forecast_event_cancelled' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-valid','foreign','source','note','forecast-domain-v1'); raise exception 'foreign option accepted'; exception when others then if sqlerrm<>'forecast_outcome_option_not_found' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-valid','yes','source','note','v2'); raise exception 'version accepted'; exception when others then if sqlerrm<>'unsupported_forecast_version' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-valid','yes',' ','note','forecast-domain-v1'); raise exception 'empty source accepted'; exception when others then if sqlerrm<>'invalid_source_reference' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-valid','yes',repeat('s',2001),'note','forecast-domain-v1'); raise exception 'large source accepted'; exception when others then if sqlerrm<>'invalid_source_reference' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-valid','yes','source',' ','forecast-domain-v1'); raise exception 'empty note accepted'; exception when others then if sqlerrm<>'invalid_resolution_note' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('outcome-valid','yes','source',repeat('n',2001),'forecast-domain-v1'); raise exception 'large note accepted'; exception when others then if sqlerrm<>'invalid_resolution_note' then raise; end if; end $$;

-- A resolution window has no destructive end deadline.
select 1/((public.resolve_forecast_event('window-late','yes','late source','late human note','forecast-domain-v1')->'event'->>'status'='resolved')::integer);
create temporary table outcome_result as select public.resolve_forecast_event('outcome-valid','yes','https://example.test/reference','human checked','forecast-domain-v1') value;
do $$ declare r jsonb; before_row jsonb; after_row jsonb; public_json jsonb; begin
 select value into r from outcome_result;
 if r->'outcome'->>'resolver_status'<>'verified' or r->'outcome'->>'source_type'<>'retailer-publication' or r->'event'->>'status'<>'resolved' then raise exception 'authoritative fields wrong'; end if;
 if abs(extract(epoch from ((r->'outcome'->>'resolved_at')::timestamptz-clock_timestamp())))>5 then raise exception 'resolved_at not server time'; end if;
 select to_jsonb(o) into before_row from public.forecast_outcomes o where event_id='outcome-valid';
 begin perform public.resolve_forecast_event('outcome-valid','yes','changed','changed','forecast-domain-v1'); raise exception 'second resolution accepted'; exception when others then if sqlerrm<>'forecast_event_already_resolved' then raise; end if; end;
 select to_jsonb(o) into after_row from public.forecast_outcomes o where event_id='outcome-valid';
 if before_row<>after_row then raise exception 'immutable outcome changed'; end if;
 public_json:=public.get_forecast_workspace('outcome-valid');
 if public_json->'outcome'->>'resolver_status'<>'verified' then raise exception 'public outcome missing'; end if;
 if public_json::text like '%resolver_user_id%' or public_json::text like '%forecast_resolvers%' or public_json::text like '%33333333-3333-3333-3333-333333333333%' then raise exception 'resolver data leaked'; end if;
end $$;
