-- Server-authoritative, city-configurable Delta submission boundary.
set search_path = public, extensions, gis;

alter table public.delta_cities
  add column submission_radius_m integer;

update public.delta_cities
set submission_radius_m = 60000
where slug = 'perm';

alter table public.delta_cities
  add constraint delta_cities_submission_radius_valid
    check (submission_radius_m is null or submission_radius_m between 1000 and 200000),
  add constraint delta_cities_active_submission_boundary
    check (not is_active or submission_radius_m is not null);

comment on column public.delta_cities.submission_radius_m is
  'Maximum server-authoritative Delta submission distance from this city centre, in metres; independent of outskirts_distance_m confirmation and priority logic.';

create or replace function public.create_delta(input_circle_id uuid,input_city_slug text,input_category_slug text,input_direction text,input_subject text,input_change_type text,input_statement text,input_details text,input_observed_window text,input_impact_level text,input_lat double precision,input_lng double precision,input_location_label text,input_location_precision text default 'point') returns jsonb language plpgsql security definer set search_path = public, extensions, gis as $$
declare uid uuid:=auth.uid(); city public.delta_cities%rowtype; cat public.delta_categories%rowtype; loc geography; publoc geography; dist numeric; target smallint; d public.deltas%rowtype;
begin
 if uid is null then raise exception 'not_authenticated'; end if; if not public.is_member(input_circle_id) then raise exception 'not_circle_member'; end if;
 select * into city from public.delta_cities where slug=input_city_slug and is_active; if city.id is null then raise exception 'city_not_found'; end if;
 select * into cat from public.delta_categories where slug=input_category_slug and is_active; if cat.id is null then raise exception 'category_not_found'; end if;
 if input_lat not between -90 and 90 or input_lng not between -180 and 180 then raise exception 'invalid_coordinates'; end if;
 if input_direction not in ('positive','negative') or input_change_type not in ('faster','slower','cheaper','more_expensive','more_available','less_available','more','less','appeared','disappeared','improved','worsened','other') or input_observed_window not in ('today','last_3_days','last_week','last_2_4_weeks') or input_impact_level not in ('noticeable','strong','critical') or coalesce(input_location_precision,'point') not in ('point','district','city') then raise exception 'invalid_delta_payload'; end if;
 loc:=ST_SetSRID(ST_MakePoint(input_lng,input_lat),4326)::geography;
 if not ST_DWithin(loc,ST_SetSRID(ST_MakePoint(city.center_lng,city.center_lat),4326)::geography,city.submission_radius_m) then raise exception 'outside_city_area'; end if;
 publoc:=ST_SetSRID(ST_MakePoint(round(input_lng::numeric,3)::double precision,round(input_lat::numeric,3)::double precision),4326)::geography;
 dist:=ST_Distance(loc, ST_SetSRID(ST_MakePoint(city.center_lng,city.center_lat),4326)::geography); target:=public.calculate_delta_confirmation_target(cat.sensitivity_weight,dist,city.outskirts_distance_m);
 insert into public.deltas(circle_id,city_id,category_id,created_by,direction,subject,change_type,statement,details,observed_window,impact_level,location,public_location,location_label,location_precision,confirmation_target,status) values(input_circle_id,city.id,cat.id,uid,input_direction,trim(input_subject),input_change_type,trim(input_statement),nullif(trim(coalesce(input_details,'')),''),input_observed_window,input_impact_level,loc,publoc,trim(input_location_label),coalesce(input_location_precision,'point'),target,'new') returning * into d;
 insert into public.delta_reactions(delta_id,user_id,reaction) values(d.id,uid,'confirm');
 return jsonb_build_object('delta', public.delta_card_json(d,uid) || jsonb_build_object('progress',jsonb_build_object('current',1,'target',target)), 'effect', jsonb_build_object('type','created','previousStatus',null,'newStatus','new','message','Дельта опубликована','detail','Сейчас вы первый наблюдатель. Нужны ещё два независимых подтверждения.'));
exception when check_violation then raise exception 'invalid_delta_payload'; end; $$;

notify pgrst, 'reload schema';
