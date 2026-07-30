\set ON_ERROR_STOP on
-- Apply after prerequisites and migrations 006–011. Assertions exercise the security contract.
begin;
do $$ begin
  assert to_regclass('public.forecast_question_proposals') is not null;
  assert (select relrowsecurity from pg_class where oid='public.forecast_question_proposals'::regclass);
  assert not has_table_privilege('authenticated','public.forecast_question_proposals','SELECT');
  assert not has_table_privilege('authenticated','public.forecast_question_proposals','INSERT');
  assert not has_table_privilege('authenticated','public.forecast_question_proposals','UPDATE');
  assert has_function_privilege('authenticated','public.submit_forecast_question_proposal(text,text,text,text,uuid,text[],text,timestamptz)','EXECUTE');
  assert pg_get_functiondef('public.moderate_forecast_question_proposal(uuid,text,text,text,text)'::regprocedure) not ilike '%insert into public.forecast_events%';
end $$;
rollback;
\echo 'forecast question pipeline smoke: schema, RLS, grants and no automatic event conversion verified'
