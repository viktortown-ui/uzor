\set ON_ERROR_STOP on
begin;
create or replace function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin execute statement; raise exception 'expected error %',expected; exception when others then if sqlerrm not like '%'||expected||'%' then raise; end if; end $$;
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004');
insert into public.circles(id) values('20000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002');
insert into public.delta_cities(id,slug) values('30000000-0000-4000-8000-000000000001','perm'),('30000000-0000-4000-8000-000000000002','other');
insert into public.open_city_circles(city_slug,circle_id) values('perm','20000000-0000-4000-8000-000000000001');
insert into public.circle_memberships(circle_id,user_id) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.deltas(id,circle_id,city_id) values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002');
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,null,'{}',null,null)$q$,'not_authenticated');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,null,'{}',null,null)$q$,'not_circle_member');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,null,'{}',null,null)$q$,'anonymous_identity');
select set_config('request.jwt.claims','{}',true);
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,'40000000-0000-4000-8000-000000000002','{}',null,null)$q$,'invalid_linked_delta');
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,'49999999-0000-4000-8000-000000000099','{}',null,null)$q$,'invalid_linked_delta');
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,null,array['a','b','c','d','e','f','g'],null,null)$q$,'too_many_options');
select pg_temp.expect_error($q$select public.submit_forecast_question_proposal('perm','Достаточно длинный вопрос?',null,null,null,array[' Да ','да'],null,null)$q$,'duplicate_options');
create temporary table submitted as select public.submit_forecast_question_proposal('perm','Откроют ли мост до сентября?',null,'Пермь','40000000-0000-4000-8000-000000000001',array['Да','Нет'],null,null) payload;
do $$ begin
 assert (select payload->>'status'='submitted' and jsonb_array_length(payload->'suggestedOptions')=2 from submitted);
 assert not has_table_privilege('authenticated','public.forecast_question_proposals','select');
 assert not has_table_privilege('authenticated','public.forecast_question_proposals','insert');
 assert not has_table_privilege('authenticated','public.forecast_question_proposals','update');
 assert not has_table_privilege('authenticated','public.forecast_question_proposals','delete');
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin assert jsonb_array_length(public.get_my_forecast_question_proposals('perm',30))=0; end $$;
select pg_temp.expect_error(format('select public.vote_forecast_question_consideration(%L,%L)',(select payload->>'id' from submitted),'support'),'voting_closed');
select pg_temp.expect_error(format('select public.moderate_forecast_question_proposal(%L,%L,null,null,null)',(select payload->>'id' from submitted),'start_review'),'editor_not_authorized');
insert into public.forecast_question_editors(user_id,created_by) values('10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'start_review',null,null,null);
select pg_temp.expect_error(format('select public.moderate_forecast_question_proposal(%L,%L,null,null,null)',(select payload->>'id' from submitted),'open_public_review'),'public_content_required');
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'open_public_review','Откроют ли мост?','Редакционное описание',null);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.vote_forecast_question_consideration((select(payload->>'id')::uuid from submitted),'support');
select public.vote_forecast_question_consideration((select(payload->>'id')::uuid from submitted),'not_now');
do $$ begin assert (select count(*)=1 and min(vote)='not_now' from public.forecast_question_consideration_votes); end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'return_to_review',null,null,null);
do $$ begin assert (select count(*)=0 from public.forecast_question_consideration_votes); assert (select public_review_started_at is null and converted_event_id is null from public.forecast_question_proposals where id=(select(payload->>'id')::uuid from submitted)); end $$;
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'open_public_review','Новая формулировка','Новое описание',null);
do $$ begin assert (select count(*)=0 from public.forecast_question_consideration_votes); assert (select count(*)=0 from public.forecast_events where id like 'proposal-%'); end $$;
do $$ declare item jsonb := public.list_public_forecast_question_proposals('perm',30,0)->0; begin assert not item ? 'authorUserId'; assert not item ? 'editorUserId'; assert not item ? 'suggestedOptions'; end $$;
-- The public list is restricted to the explicitly open mapped circle, even for the same city.
insert into public.forecast_question_proposals(author_user_id,circle_id,city_id,raw_question,public_title,public_summary,editor_user_id,status,public_review_started_at)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Вопрос из другого круга','Чужая тема','Не должна попасть в выдачу','10000000-0000-4000-8000-000000000004','public_review',now());
do $$ begin assert jsonb_array_length(public.list_public_forecast_question_proposals('perm',30,0))=1; end $$;
update public.open_city_circles set is_open=false where city_slug='perm';
do $$ begin assert jsonb_array_length(public.list_public_forecast_question_proposals('perm',30,0))=0; end $$;
update public.open_city_circles set is_open=true where city_slug='perm';
do $$ begin assert jsonb_array_length(public.list_public_forecast_question_proposals('perm',30,0))=1; end $$;
-- Votes remain visible while selected, but a selected topic starts clean after editorial rewriting.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.vote_forecast_question_consideration((select(payload->>'id')::uuid from submitted),'support');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'select',null,null,null);
do $$ begin assert (select count(*)=1 from public.forecast_question_consideration_votes); assert (select selected_at is not null from public.forecast_question_proposals where id=(select(payload->>'id')::uuid from submitted)); end $$;
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'return_to_review',null,null,null);
do $$ begin assert (select count(*)=0 from public.forecast_question_consideration_votes); assert (select selected_at is null and public_review_started_at is null from public.forecast_question_proposals where id=(select(payload->>'id')::uuid from submitted)); end $$;
select public.moderate_forecast_question_proposal((select(payload->>'id')::uuid from submitted),'open_public_review','Третья формулировка','Описание нового раунда',null);
do $$ begin assert (select count(*)=0 from public.forecast_question_consideration_votes); assert (select public_review_started_at is not null from public.forecast_question_proposals where id=(select(payload->>'id')::uuid from submitted)); assert (select (public.list_public_forecast_question_proposals('perm',30,0)->0->>'totalVotes')::int=0); end $$;
-- Explicit NULL pagination arguments retain server-side caps.
insert into public.forecast_question_proposals(author_user_id,circle_id,city_id,raw_question)
select '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Приватный вопрос номер '||n from generate_series(1,105) n;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin assert jsonb_array_length(public.get_my_forecast_question_proposals('perm',null))=100; end $$;
insert into public.forecast_question_proposals(author_user_id,circle_id,city_id,raw_question,public_title,public_summary,editor_user_id,status,public_review_started_at)
select '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Публичный вопрос номер '||n,'Публичная тема '||n,'Описание темы '||n,'10000000-0000-4000-8000-000000000004','public_review',now() from generate_series(1,105) n;
do $$ begin assert jsonb_array_length(public.list_public_forecast_question_proposals('perm',null,null))=100; end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin assert jsonb_array_length(public.get_forecast_question_editor_queue(null,null))=200; end $$;
select pg_temp.expect_error($q$delete from auth.users where id='10000000-0000-4000-8000-000000000004'$q$,'foreign key');
rollback;
\echo 'forecast question pipeline behavioral smoke passed'
