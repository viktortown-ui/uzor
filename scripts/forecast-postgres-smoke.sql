\set ON_ERROR_STOP on

-- The fictional event is exposed through the read RPC to anon, without table access.
set role anon;
select 1 / ((public.get_forecast_workspace('sandbox-demo-milk-price-2026-12-15') -> 'event' ->> 'id'
  = 'sandbox-demo-milk-price-2026-12-15')::integer) as anonymous_event_is_visible;
reset role;

do $$ begin
  if has_function_privilege('anon','public.submit_forecast(text,text,numeric,text,text)','execute') then raise exception 'anon can execute submit'; end if;
  if has_table_privilege('anon','public.user_forecasts','select') or has_table_privilege('authenticated','public.user_forecasts','select')
    or has_table_privilege('anon','public.user_forecasts','insert') or has_table_privilege('authenticated','public.user_forecasts','insert') then
    raise exception 'direct forecast table access is available';
  end if;
end $$;

-- Authenticated execution with no auth.uid() is rejected by the RPC itself.
set role authenticated;
do $$ begin
  perform public.submit_forecast('sandbox-demo-milk-price-2026-12-15','above',0.5,null,'forecast-domain-v1');
  raise exception 'anonymous submission was accepted';
exception when others then
  if sqlerrm <> 'not_authenticated' then raise; end if;
end $$;
reset role;

insert into auth.users(id) values ('11111111-1111-1111-1111-111111111111');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
create temporary table forecast_smoke_results(first_result jsonb, second_result jsonb);
insert into forecast_smoke_results(first_result)
select public.submit_forecast('sandbox-demo-milk-price-2026-12-15','above',0.5,' first ','forecast-domain-v1');
select pg_sleep(0.01);
update forecast_smoke_results set second_result=
  public.submit_forecast('sandbox-demo-milk-price-2026-12-15','not-above',0.7,'second','forecast-domain-v1');

do $$ declare first_result jsonb; second_result jsonb; begin
  select r.first_result,r.second_result into first_result,second_result from forecast_smoke_results r;
  if (first_result->>'created')::boolean is not true or (second_result->>'created')::boolean is not false then raise exception 'created flags are wrong'; end if;
  if first_result->'forecast'->>'id' <> second_result->'forecast'->>'id' then raise exception 'forecast id changed'; end if;
  if first_result->'forecast'->>'created_at' <> second_result->'forecast'->>'created_at' then raise exception 'created_at changed'; end if;
  if first_result->'forecast'->>'updated_at' = second_result->'forecast'->>'updated_at' then raise exception 'updated_at did not change'; end if;
end $$;

do $$ begin
  perform public.submit_forecast('sandbox-demo-milk-price-2026-12-15','foreign',0.8,null,'forecast-domain-v1');
  raise exception 'foreign option was accepted';
exception when others then
  if sqlerrm <> 'forecast_option_not_found' then raise; end if;
end $$;

update public.forecast_events set closes_at=clock_timestamp()-interval '1 second', resolves_at=clock_timestamp()+interval '1 day'
where id='sandbox-demo-milk-price-2026-12-15';
do $$ begin
  perform public.submit_forecast('sandbox-demo-milk-price-2026-12-15','above',0.9,'rejected','forecast-domain-v1');
  raise exception 'past-deadline update was accepted';
exception when others then
  if sqlerrm <> 'forecast_deadline_passed' then raise; end if;
end $$;
do $$ declare stored public.user_forecasts%rowtype; begin
  select * into stored from public.user_forecasts where event_id='sandbox-demo-milk-price-2026-12-15';
  if stored.selected_option_id <> 'not-above' or stored.probability <> 0.7 or stored.reasoning <> 'second' then
    raise exception 'deadline rejection mutated forecast';
  end if;
end $$;
