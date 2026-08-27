-- Atomic ordering helpers for user-owned workout plans.
-- The API calls these functions with the authenticated user's id. Execution is
-- restricted to service_role because the functions are SECURITY DEFINER.

create or replace function public.reorder_user_workout_plan_sections(
  p_user_id uuid,
  p_plan_id uuid,
  p_section_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  supplied_count integer;
  section_id uuid;
  next_order integer := 0;
begin
  if not exists (
    select 1
    from public.user_workout_plans
    where id = p_plan_id and user_id = p_user_id
  ) then
    raise exception 'workout plan not found';
  end if;

  select count(*) into expected_count
  from public.user_workout_plan_sections
  where plan_id = p_plan_id;

  supplied_count := coalesce(array_length(p_section_ids, 1), 0);

  if supplied_count <> expected_count
    or (
      select count(distinct value)
      from unnest(coalesce(p_section_ids, '{}'::uuid[])) as value
    ) <> expected_count
    or exists (
      select 1
      from unnest(coalesce(p_section_ids, '{}'::uuid[])) as supplied(id)
      left join public.user_workout_plan_sections section
        on section.id = supplied.id and section.plan_id = p_plan_id
      where section.id is null
    )
  then
    raise exception 'section order must contain every section exactly once';
  end if;

  update public.user_workout_plan_sections
  set sort_order = sort_order + 1000000
  where plan_id = p_plan_id;

  foreach section_id in array coalesce(p_section_ids, '{}'::uuid[])
  loop
    update public.user_workout_plan_sections
    set sort_order = next_order
    where id = section_id and plan_id = p_plan_id;
    next_order := next_order + 1;
  end loop;

  update public.user_workout_plans
  set updated_at = now()
  where id = p_plan_id and user_id = p_user_id;
end;
$$;

create or replace function public.reorder_user_workout_plan_items(
  p_user_id uuid,
  p_plan_id uuid,
  p_section_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  supplied_count integer;
  item_id uuid;
  next_order integer := 0;
begin
  if not exists (
    select 1
    from public.user_workout_plan_sections section
    join public.user_workout_plans plan on plan.id = section.plan_id
    where section.id = p_section_id
      and section.plan_id = p_plan_id
      and plan.user_id = p_user_id
  ) then
    raise exception 'workout plan section not found';
  end if;

  select count(*) into expected_count
  from public.user_workout_plan_items
  where section_id = p_section_id;

  supplied_count := coalesce(array_length(p_item_ids, 1), 0);

  if supplied_count <> expected_count
    or (
      select count(distinct value)
      from unnest(coalesce(p_item_ids, '{}'::uuid[])) as value
    ) <> expected_count
    or exists (
      select 1
      from unnest(coalesce(p_item_ids, '{}'::uuid[])) as supplied(id)
      left join public.user_workout_plan_items item
        on item.id = supplied.id and item.section_id = p_section_id
      where item.id is null
    )
  then
    raise exception 'item order must contain every item exactly once';
  end if;

  update public.user_workout_plan_items
  set sort_order = sort_order + 1000000
  where section_id = p_section_id;

  foreach item_id in array coalesce(p_item_ids, '{}'::uuid[])
  loop
    update public.user_workout_plan_items
    set sort_order = next_order
    where id = item_id and section_id = p_section_id;
    next_order := next_order + 1;
  end loop;

  update public.user_workout_plans
  set updated_at = now()
  where id = p_plan_id and user_id = p_user_id;
end;
$$;

revoke all on function public.reorder_user_workout_plan_sections(uuid, uuid, uuid[])
from public, anon, authenticated;
revoke all on function public.reorder_user_workout_plan_items(uuid, uuid, uuid, uuid[])
from public, anon, authenticated;

grant execute on function public.reorder_user_workout_plan_sections(uuid, uuid, uuid[])
to service_role;
grant execute on function public.reorder_user_workout_plan_items(uuid, uuid, uuid, uuid[])
to service_role;
