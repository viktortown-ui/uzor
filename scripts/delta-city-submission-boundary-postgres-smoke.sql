\set ON_ERROR_STOP on
begin;
\ir delta-postgres-prerequisites.sql
\ir ../supabase/migrations/001_uzor_init.sql
\ir ../supabase/migrations/006_delta_foundation.sql

create temporary table create_delta_acl_before as
select proacl from pg_proc where oid = 'public.create_delta(uuid,text,text,text,text,text,text,text,text,text,double precision,double precision,text,text)'::regprocedure;

\ir ../supabase/migrations/012_delta_city_submission_boundary_v1.sql

insert into auth.users(id) values ('20000000-0000-0000-0000-000000000001');
insert into public.circles(id,name,context,invite_code_hash) values ('10000000-0000-0000-0000-000000000001','Boundary test','Test','boundary-test');
insert into public.circle_memberships(circle_id,user_id) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',false);

create or replace function pg_temp.submit(city_slug text, point geography) returns jsonb language sql as $$
  select public.create_delta(
    '10000000-0000-0000-0000-000000000001', city_slug, 'transport', 'positive', 'Автобус', 'faster',
    'Автобус стал быстрее', null, 'today', 'noticeable', ST_Y(point::geometry), ST_X(point::geometry), 'Тестовая точка', 'point'
  )
$$;

do $$
declare centre geography; inside geography; just_inside geography; just_outside geography; result jsonb; before_deltas bigint; before_reactions bigint;
begin
  select ST_SetSRID(ST_MakePoint(center_lng,center_lat),4326)::geography into centre from public.delta_cities where slug='perm';
  if (select submission_radius_m from public.delta_cities where slug='perm') <> 60000 then raise exception 'Perm radius is not 60000'; end if;
  if (select outskirts_distance_m from public.delta_cities where slug='perm') <> 8000 then raise exception 'outskirts_distance_m changed'; end if;
  if (select proacl from pg_proc where oid='public.create_delta(uuid,text,text,text,text,text,text,text,text,text,double precision,double precision,text,text)'::regprocedure)
     is distinct from (select proacl from create_delta_acl_before) then raise exception 'create_delta execute ACL changed'; end if;

  result := pg_temp.submit('perm', centre);
  if result->'delta'->>'id' is null or result->'effect'->>'type' <> 'created' or result->'delta'->'progress'->>'current' <> '1' then raise exception 'response shape changed'; end if;
  if (select count(*) from public.delta_reactions where delta_id=(result->'delta'->>'id')::uuid and reaction='confirm') <> 1 then raise exception 'initial confirmation missing'; end if;
  if (select ST_Equals(location::geometry,centre::geometry) and ST_X(public_location::geometry)=round(ST_X(centre::geometry)::numeric,3)::double precision from public.deltas where id=(result->'delta'->>'id')::uuid) is not true then raise exception 'coordinate behavior changed'; end if;

  inside := ST_Project(centre,30000,0); perform pg_temp.submit('perm',inside);
  just_inside := ST_Project(centre,59990,0); perform pg_temp.submit('perm',just_inside);
  just_outside := ST_Project(centre,60010,0);
  select count(*), (select count(*) from public.delta_reactions) into before_deltas,before_reactions from public.deltas;
  begin perform pg_temp.submit('perm',just_outside); raise exception 'just-outside point accepted'; exception when others then if SQLERRM <> 'outside_city_area' then raise; end if; end;
  begin perform pg_temp.submit('perm',ST_Project(centre,150000,0)); raise exception 'far point accepted'; exception when others then if SQLERRM <> 'outside_city_area' then raise; end if; end;
  if (select count(*) from public.deltas) <> before_deltas or (select count(*) from public.delta_reactions) <> before_reactions then raise exception 'rejection inserted rows'; end if;
  begin perform public.create_delta('10000000-0000-0000-0000-000000000001','perm','transport','positive','Автобус','faster','Автобус стал быстрее',null,'today','noticeable',91,56,'Тест','point'); raise exception 'invalid latitude accepted'; exception when others then if SQLERRM <> 'invalid_coordinates' then raise; end if; end;
  begin perform pg_temp.submit('unknown',centre); raise exception 'unknown city accepted'; exception when others then if SQLERRM <> 'city_not_found' then raise; end if; end;
end $$;

insert into public.delta_cities(slug,name,center_lat,center_lng,default_zoom,outskirts_distance_m,submission_radius_m)
values ('synthetic','Тестовый город',55.75,37.62,11,7000,10000), ('inactive','Неактивный город',55,37,11,7000,10000);
update public.delta_cities set is_active=false where slug='inactive';

do $$
declare synthetic geography := ST_SetSRID(ST_MakePoint(37.62,55.75),4326)::geography; perm geography := ST_SetSRID(ST_MakePoint(56.2502,58.0105),4326)::geography;
begin
  perform pg_temp.submit('synthetic',synthetic);
  perform pg_temp.submit('synthetic',ST_Project(synthetic,9990,pi()/2));
  begin perform pg_temp.submit('synthetic',ST_Project(synthetic,10010,pi()/2)); raise exception 'synthetic radius bypassed'; exception when others then if SQLERRM <> 'outside_city_area' then raise; end if; end;
  begin perform pg_temp.submit('synthetic',perm); raise exception 'Perm point accepted for synthetic city'; exception when others then if SQLERRM <> 'outside_city_area' then raise; end if; end;
  begin perform pg_temp.submit('inactive',synthetic); raise exception 'inactive city accepted'; exception when others then if SQLERRM <> 'city_not_found' then raise; end if; end;
end $$;

set local role authenticated;
do $$ begin perform 1 from public.deltas; raise exception 'direct Delta table access accepted'; exception when insufficient_privilege then null; end $$;
do $$ begin insert into public.delta_reactions(delta_id,user_id,reaction) values(gen_random_uuid(),gen_random_uuid(),'confirm'); raise exception 'direct reaction write accepted'; exception when insufficient_privilege then null; end $$;
reset role;

rollback;
