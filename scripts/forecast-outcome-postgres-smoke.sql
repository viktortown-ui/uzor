\set ON_ERROR_STOP on

do $$ begin
 if not (select relrowsecurity from pg_class where oid='public.forecast_resolvers'::regclass) then raise exception 'resolver RLS disabled'; end if;
 if not (select relrowsecurity from pg_class where oid='public.forecast_outcomes'::regclass) then raise exception 'outcome RLS disabled'; end if;
 if has_table_privilege('authenticated','public.forecast_resolvers','select') or has_table_privilege('authenticated','public.forecast_outcomes','insert,update,delete') then raise exception 'direct access exists'; end if;
end $$;

insert into auth.users(id) values ('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333');
set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222';
do $$ begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above','source','note','forecast-domain-v1'); raise exception 'ordinary user resolved'; exception when others then if sqlerrm<>'forecast_resolver_not_authorized' then raise; end if; end $$;
insert into public.forecast_resolvers(user_id,note) values ('33333333-3333-3333-3333-333333333333','smoke resolver');
set request.jwt.claim.sub='33333333-3333-3333-3333-333333333333';
select 1/((public.get_forecast_resolution_workspace('sandbox-demo-milk-price-2026-12-15')->>'authorized')::boolean::integer);
do $$ begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above','source','note','forecast-domain-v1'); raise exception 'resolved before close'; exception when others then if sqlerrm<>'forecast_event_still_open' then raise; end if; end $$;
update public.forecast_events set closes_at=clock_timestamp()-interval '2 hours',resolves_at=clock_timestamp()+interval '1 hour' where id='sandbox-demo-milk-price-2026-12-15';
do $$ begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above','source','note','forecast-domain-v1'); raise exception 'resolved before resolution'; exception when others then if sqlerrm<>'forecast_resolution_time_not_reached' then raise; end if; end $$;
update public.forecast_events set resolves_at=clock_timestamp()-interval '1 hour' where id='sandbox-demo-milk-price-2026-12-15';
do $$ begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','foreign','source','note','forecast-domain-v1'); raise exception 'foreign option accepted'; exception when others then if sqlerrm<>'forecast_outcome_option_not_found' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above',' ','note','forecast-domain-v1'); raise exception 'empty source accepted'; exception when others then if sqlerrm<>'invalid_source_reference' then raise; end if; end $$;
do $$ begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above','source',' ','forecast-domain-v1'); raise exception 'empty note accepted'; exception when others then if sqlerrm<>'invalid_resolution_note' then raise; end if; end $$;
create temporary table outcome_result as select public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above','https://example.test/reference','human checked','forecast-domain-v1') value;
do $$ declare r jsonb; before_row jsonb; after_row jsonb; begin
 select value into r from outcome_result;
 if r->'outcome'->>'resolver_status'<>'verified' or r->'outcome'->>'source_type'<>'retailer-publication' or r->'event'->>'status'<>'resolved' then raise exception 'authoritative fields wrong'; end if;
 if abs(extract(epoch from ((r->'outcome'->>'resolved_at')::timestamptz-clock_timestamp())))>5 then raise exception 'resolved_at not server time'; end if;
 select to_jsonb(o) into before_row from public.forecast_outcomes o where event_id='sandbox-demo-milk-price-2026-12-15';
 begin perform public.resolve_forecast_event('sandbox-demo-milk-price-2026-12-15','above','changed','changed','forecast-domain-v1'); raise exception 'second resolution accepted'; exception when others then if sqlerrm<>'forecast_event_already_resolved' then raise; end if; end;
 select to_jsonb(o) into after_row from public.forecast_outcomes o where event_id='sandbox-demo-milk-price-2026-12-15';
 if before_row<>after_row then raise exception 'immutable outcome changed'; end if;
 if public.get_forecast_workspace('sandbox-demo-milk-price-2026-12-15')->'outcome'->>'resolver_status'<>'verified' then raise exception 'public outcome missing'; end if;
 if public.get_forecast_workspace('sandbox-demo-milk-price-2026-12-15')->'outcome' ? 'resolver_user_id' then raise exception 'resolver id leaked'; end if;
end $$;
