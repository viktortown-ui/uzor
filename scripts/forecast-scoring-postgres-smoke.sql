\set ON_ERROR_STOP on
begin;
do $$ begin
 if not (select relrowsecurity from pg_class where oid='public.forecast_scores'::regclass) then raise exception 'RLS disabled'; end if;
 if has_table_privilege('anon','public.forecast_scores','select') or has_table_privilege('authenticated','public.forecast_scores','select,insert,update,delete') then raise exception 'direct privilege leaked';end if;
end $$;
-- Backfill fixture was created before 009 by CI.
do $$ declare s forecast_scores%rowtype;begin select * into strict s from forecast_scores where event_id='score-backfill';if s.brier_score<>.04 or s.scored_at<>'2026-01-03T00:00:00Z' then raise exception 'bad backfill';end if;end $$;
-- A future event with two private forecasts.
insert into auth.users values('30000000-0000-0000-0000-000000000001'),('30000000-0000-0000-0000-000000000002'),('30000000-0000-0000-0000-000000000003'),('30000000-0000-0000-0000-000000000004'),('30000000-0000-0000-0000-000000000005');
insert into forecast_resolvers(user_id) values('30000000-0000-0000-0000-000000000003');
insert into forecast_events(id,title,short_description,category,opens_at,closes_at,resolves_at,status,resolution_source,is_demo,domain_version) values('score-future','t','d','c','2025-01-01','2025-01-02','2025-01-03','open','official-publication',false,'forecast-domain-v1');
insert into forecast_options(event_id,id,label,sort_order) values('score-future','yes','Y',1),('score-future','no','N',2);
insert into user_forecasts(id,event_id,user_id,selected_option_id,probability,domain_version) values('31000000-0000-0000-0000-000000000001','score-future','30000000-0000-0000-0000-000000000001','yes',.8,'forecast-domain-v1'),('31000000-0000-0000-0000-000000000002','score-future','30000000-0000-0000-0000-000000000002','no',.8,'forecast-domain-v1');
set local role authenticated;select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);select resolve_forecast_event('score-future','yes','official','verified','forecast-domain-v1');reset role;
do $$ declare oid uuid;begin
 select id into oid from forecast_outcomes where event_id='score-future';
 if (select count(*) from forecast_scores where event_id='score-future')<>2 then raise exception 'not one score per forecast';end if;
 if (select brier_score from forecast_scores where forecast_id='31000000-0000-0000-0000-000000000001')<>.04 then raise exception 'expected .04';end if;
 if (select brier_score from forecast_scores where forecast_id='31000000-0000-0000-0000-000000000002')<>.64 then raise exception 'expected .64';end if;
 if exists(select 1 from forecast_scores s join forecast_outcomes o on o.id=s.outcome_id where s.event_id='score-future' and (s.scored_at<>o.resolved_at or s.id<>s.forecast_id::text||':'||s.outcome_id::text||':brier-binary-v1')) then raise exception 'identity or time mismatch';end if;
end $$;
-- Exact generated-column boundaries.
insert into forecast_events(id,title,short_description,category,opens_at,closes_at,resolves_at,status,resolution_source,is_demo,domain_version) values('score-boundary','t','d','c','2025-01-01','2025-01-02','2025-01-03','resolved','official-publication',false,'forecast-domain-v1');
insert into forecast_options(event_id,id,label,sort_order) values('score-boundary','yes','Y',1),('score-boundary','no','N',2);
insert into forecast_outcomes(id,event_id,resolved_option_id,resolved_at,source_reference,source_type,resolution_note,resolver_status,resolver_user_id,domain_version) values('32000000-0000-0000-0000-000000000000','score-boundary','yes','2025-01-03','x','official-publication','x','verified','30000000-0000-0000-0000-000000000003','forecast-domain-v1');
insert into user_forecasts(id,event_id,user_id,selected_option_id,probability,domain_version) values('32000000-0000-0000-0000-000000000001','score-boundary','30000000-0000-0000-0000-000000000001','yes',1,'forecast-domain-v1'),('32000000-0000-0000-0000-000000000002','score-boundary','30000000-0000-0000-0000-000000000004','no',1,'forecast-domain-v1'),('32000000-0000-0000-0000-000000000003','score-boundary','30000000-0000-0000-0000-000000000005','no',0,'forecast-domain-v1');
insert into forecast_scores(id,event_id,forecast_id,outcome_id,user_id,forecast_probability,observed_binary_outcome,scored_at,scoring_version,domain_version) values('32000000-0000-0000-0000-000000000001:32000000-0000-0000-0000-000000000000:brier-binary-v1','score-boundary','32000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001',1,1,'2025-01-03','brier-binary-v1','forecast-domain-v1'),('32000000-0000-0000-0000-000000000002:32000000-0000-0000-0000-000000000000:brier-binary-v1','score-boundary','32000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000004',1,0,'2025-01-03','brier-binary-v1','forecast-domain-v1'),('32000000-0000-0000-0000-000000000003:32000000-0000-0000-0000-000000000000:brier-binary-v1','score-boundary','32000000-0000-0000-0000-000000000003','32000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000005',0,0,'2025-01-03','brier-binary-v1','forecast-domain-v1');
do $$begin if (select brier_score from forecast_scores where forecast_id='32000000-0000-0000-0000-000000000001')<>0 or (select brier_score from forecast_scores where forecast_id='32000000-0000-0000-0000-000000000002')<>1 or (select brier_score from forecast_scores where forecast_id='32000000-0000-0000-0000-000000000003')<>0 then raise exception 'boundary calculations';end if;begin insert into forecast_scores(id,event_id,forecast_id,outcome_id,user_id,forecast_probability,observed_binary_outcome,scored_at,scoring_version,domain_version) select id,event_id,forecast_id,outcome_id,user_id,forecast_probability,observed_binary_outcome,scored_at,scoring_version,domain_version from forecast_scores where event_id='score-boundary';raise exception 'duplicate accepted';exception when unique_violation then null;end;end $$;
-- Privacy JSON: owner sees score without user_id; other user and anon see null.
set local role authenticated;select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
do $$declare j jsonb:=get_forecast_workspace('score-future');begin if j->'score' is null or (j->'score')?'user_id' then raise exception 'owner JSON invalid';end if;end$$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
do $$begin if get_forecast_workspace('score-future')->'score'<>'null'::jsonb then raise exception 'other score leaked';end if;end$$;
reset role;do $$begin if get_forecast_workspace('score-future')->'score'<>'null'::jsonb then raise exception 'anon score leaked';end if;end$$;
rollback;
