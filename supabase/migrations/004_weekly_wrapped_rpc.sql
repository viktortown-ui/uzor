-- MVP 1.3: safe personal weekly Wrapped aggregates.
-- Run after 003_uzor_read_rpc.sql. Does not recreate tables, disable RLS, or expose raw rows from other users.

drop function if exists public.get_my_wrapped_report(uuid, date);

create function public.get_my_wrapped_report(input_theme_id uuid default null, input_week_start date default null)
returns jsonb
language plpgsql stable security definer set search_path='public' as $$
declare
  u_id uuid := auth.uid();
  t_id uuid;
  c_id uuid;
  week_start date := coalesce(input_week_start, (date_trunc('week', now())::date));
  week_end date := coalesce(input_week_start, (date_trunc('week', now())::date)) + 6;
  signals_count int := 0;
  confirmed_count int := 0;
  early_count int := 0;
  streak_count int := 0;
  accuracy int := 0;
  xp int := 0;
  main_label text := 'Пока данных мало';
  main_share int := 0;
  style text := 'Новый наблюдатель';
  title text := 'Новый наблюдатель';
  subtitle text := 'Ваш личный отчёт ещё собирается.';
  top_themes jsonb := '[]'::jsonb;
  activity jsonb := '[]'::jsonb;
  right_signals jsonb := '[]'::jsonb;
  explain jsonb := '[]'::jsonb;
begin
  if u_id is null then raise exception 'not authenticated'; end if;

  if input_theme_id is null then
    select t.id, t.circle_id into t_id, c_id
    from public.themes t join public.circle_memberships m on m.circle_id = t.circle_id
    where m.user_id = u_id and t.is_active
    order by m.joined_at desc, t.created_at desc limit 1;
  else
    select t.id, t.circle_id into t_id, c_id from public.themes t where t.id = input_theme_id and t.is_active;
  end if;

  if t_id is null or c_id is null or not public.is_member(c_id) then raise exception 'no active circle'; end if;

  with week_rows as (
    select c.* from public.contributions c where c.theme_id=t_id and c.circle_id=c_id and c.user_id=u_id and c.created_at >= week_start and c.created_at < week_start + 7
  ), circle_branch as (
    select layer, signal_id, consequence_id, count(distinct user_id) participants, min(created_at) first_at,
      least(1, .18 * sqrt(count(distinct user_id)) + .14 * sqrt(count(distinct group_id)) + .10 * case when count(distinct evidence)>1 then 1 else .5 end) clarity
    from public.contributions where theme_id=t_id and circle_id=c_id group by 1,2,3
  ), mine as (
    select w.*, cb.participants, cb.first_at, cb.clarity, (cb.participants >= 2 or cb.clarity >= .35) as confirmed
    from week_rows w join circle_branch cb using(layer, signal_id, consequence_id)
  )
  select count(*), count(*) filter(where confirmed), count(*) filter(where created_at <= first_at + interval '5 minutes' and participants >= 2)
  into signals_count, confirmed_count, early_count from mine;

  accuracy := case when signals_count > 0 then round(confirmed_count::numeric / signals_count * 100)::int else 0 end;
  xp := signals_count * 100 + confirmed_count * 250 + early_count * 500;

  with weeks as (select generate_series(0,7) n), flags as (
    select n, exists(select 1 from public.contributions c where c.theme_id=t_id and c.circle_id=c_id and c.user_id=u_id and c.created_at >= (week_start - (n || ' weeks')::interval) and c.created_at < (week_start - ((n - 1) || ' weeks')::interval)) has_signal from weeks
  ), broken as (select coalesce(min(n),8) first_gap from flags where not has_signal)
  select first_gap into streak_count from broken;
  xp := xp + greatest(0, streak_count) * 150;

  if early_count >= 1 then style := 'Ранний наблюдатель'; title := style; subtitle := 'Вы замечаете сдвиги раньше круга.';
  elsif accuracy >= 70 and signals_count >= 5 then style := 'Точный прогнозист'; title := style; subtitle := 'Ваши сигналы часто подтверждаются кругом.';
  elsif signals_count >= 10 then style := 'Сигнальный разведчик'; title := style; subtitle := 'Вы активно исследуете слабые сигналы недели.';
  elsif signals_count > 0 and signals_count <= 5 and accuracy >= 50 then style := 'Осторожный аналитик'; title := style; subtitle := 'Вы добавляете немного сигналов, но они попадают в контур.';
  end if;

  with counts as (
    select coalesce(ci.label, c.layer) label, count(*) cnt from public.contributions c left join public.catalog_items ci on ci.id=c.signal_id
    where c.theme_id=t_id and c.circle_id=c_id and c.user_id=u_id and c.created_at >= week_start and c.created_at < week_start + 7 group by 1 order by cnt desc, label limit 5
  ), total as (select greatest(1, sum(cnt)) total from counts)
  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'share', round(cnt::numeric / total.total * 100)::int) order by cnt desc), '[]'::jsonb) into top_themes from counts, total group by total.total;
  select coalesce(top_themes->0->>'label','Пока данных мало'), coalesce((top_themes->0->>'share')::int,0) into main_label, main_share;

  with days as (select generate_series(0,6) n), mine as (
    select c.*, (cb.participants >= 2 or cb.clarity >= .35) confirmed from public.contributions c
    join (select layer, signal_id, consequence_id, count(distinct user_id) participants, least(1, .18*sqrt(count(distinct user_id)) + .14*sqrt(count(distinct group_id)) + .10*case when count(distinct evidence)>1 then 1 else .5 end) clarity from public.contributions where theme_id=t_id and circle_id=c_id group by 1,2,3) cb using(layer, signal_id, consequence_id)
    where c.theme_id=t_id and c.circle_id=c_id and c.user_id=u_id and c.created_at >= week_start and c.created_at < week_start + 7
  )
  select jsonb_agg(jsonb_build_object('day', (array['Пн','Вт','Ср','Чт','Пт','Сб','Вс'])[n+1], 'signals', (select count(*) from mine where created_at::date=week_start+n), 'confirmed', (select count(*) from mine where created_at::date=week_start+n and confirmed), 'unconfirmed', (select count(*) from mine where created_at::date=week_start+n and not confirmed)) order by n) into activity from days;

  with circle_branch as (select layer, signal_id, consequence_id, count(distinct user_id) participants from public.contributions where theme_id=t_id and circle_id=c_id group by 1,2,3), mine as (
    select c.*, s.label signal_label, coalesce(k.label, c.layer) consequence_label from public.contributions c left join public.catalog_items s on s.id=c.signal_id left join public.catalog_items k on k.id=c.consequence_id join circle_branch cb using(layer, signal_id, consequence_id)
    where c.theme_id=t_id and c.circle_id=c_id and c.user_id=u_id and c.created_at >= week_start and c.created_at < week_start + 7 and cb.participants >= 2 order by c.updated_at desc limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object('title', coalesce(signal_label,'Сигнал круга'), 'consequence', consequence_label, 'tag', layer, 'status', 'Подтверждено', 'time', to_char(updated_at, 'Dy HH24:MI'))), '[]'::jsonb) into right_signals from mine;

  explain := jsonb_build_array(confirmed_count || ' ваших сигналов подтвердились другими участниками.', early_count || ' сигнал(ов) вы заметили раньше круга.', 'Главная тема недели — ' || lower(main_label) || '.');

  return jsonb_build_object(
    'period', jsonb_build_object('weekStart', week_start, 'weekEnd', week_end, 'label', 'Эта неделя'),
    'identity', jsonb_build_object('title', title, 'subtitle', subtitle, 'percentileText', case when signals_count > 0 then 'Вы в числе участников, чьи сигналы собирают контур' else null end, 'style', style),
    'summary', jsonb_build_object('signalsThisWeek', signals_count, 'confirmedSignals', confirmed_count, 'accuracy', accuracy, 'earlySignals', early_count, 'weekStreak', streak_count, 'xp', xp, 'nextLevelXp', 10000, 'xpToNextLevel', greatest(0, 10000 - xp)),
    'mainTheme', jsonb_build_object('label', main_label, 'share', main_share, 'description', case when signals_count > 0 then 'Вы замечали чаще всего в этой ветке.' else 'Оставьте несколько сигналов, чтобы УЗОР собрал главную тему.' end),
    'topThemes', coalesce(top_themes, '[]'::jsonb), 'activity', activity, 'rightSignals', right_signals,
    'progress', jsonb_build_object('currentLevel', title, 'previousLevel', 'Сигнальный разведчик', 'nextLevel', 'Тренд-предвидец', 'nextLevelLocked', true),
    'explain', explain, 'isEmpty', signals_count = 0
  );
end;
$$;

revoke all on function public.get_my_wrapped_report(uuid, date) from public;
grant execute on function public.get_my_wrapped_report(uuid, date) to authenticated;
