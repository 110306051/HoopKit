-- Immutable workout snapshots and server-validated execution progress.
create type public.workout_session_status as enum (
  'active',
  'paused',
  'completed',
  'abandoned'
);

create type public.workout_session_item_status as enum (
  'pending',
  'completed',
  'skipped'
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_plan_id uuid references public.user_workout_plans (id) on delete set null,
  plan_name_snapshot text not null,
  plan_description_snapshot text not null default '',
  status public.workout_session_status not null default 'active',
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  accumulated_pause_seconds integer not null default 0,
  completed_at timestamptz,
  elapsed_seconds integer,
  current_item_index integer not null default 0,
  total_items integer not null default 0,
  completed_items integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_pause_seconds_check
    check (accumulated_pause_seconds >= 0),
  constraint workout_sessions_elapsed_seconds_check
    check (elapsed_seconds is null or elapsed_seconds >= 0),
  constraint workout_sessions_item_counts_check
    check (
      current_item_index >= 0
      and total_items >= 0
      and completed_items >= 0
      and completed_items <= total_items
    )
);

create unique index workout_sessions_one_open_per_user_idx
  on public.workout_sessions (user_id)
  where status in ('active', 'paused');

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create table public.workout_session_sections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  source_section_id uuid not null,
  name_snapshot text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint workout_session_sections_sort_check check (sort_order >= 0),
  constraint workout_session_sections_source_unique
    unique (session_id, source_section_id),
  constraint workout_session_sections_position_unique
    unique (session_id, sort_order)
);

create table public.workout_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  section_id uuid not null references public.workout_session_sections (id) on delete cascade,
  source_plan_item_id uuid not null,
  source_move_id uuid,
  move_slug_snapshot text,
  title_snapshot text not null,
  instructions_snapshot text not null default '',
  sets_snapshot integer,
  reps_snapshot integer,
  duration_seconds_snapshot integer,
  rest_seconds_snapshot integer not null default 0,
  section_sort_order integer not null,
  item_sort_order integer not null,
  global_sort_order integer not null,
  completed_sets integer not null default 0,
  status public.workout_session_item_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_session_items_volume_check check (
    (sets_snapshot is null or sets_snapshot > 0)
    and (reps_snapshot is null or reps_snapshot > 0)
    and (duration_seconds_snapshot is null or duration_seconds_snapshot > 0)
    and rest_seconds_snapshot >= 0
    and completed_sets >= 0
  ),
  constraint workout_session_items_has_work_check
    check (reps_snapshot is not null or duration_seconds_snapshot is not null),
  constraint workout_session_items_global_position_unique
    unique (session_id, global_sort_order),
  constraint workout_session_items_source_unique
    unique (session_id, source_plan_item_id)
);

create index workout_session_items_section_sort_idx
  on public.workout_session_items (section_id, item_sort_order);

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create trigger workout_session_items_set_updated_at
before update on public.workout_session_items
for each row execute function public.set_updated_at();

create or replace function public.start_user_workout_session(
  p_user_id uuid,
  p_plan_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_session_id uuid;
  item_count integer;
begin
  if not exists (
    select 1
    from public.user_workout_plans
    where id = p_plan_id and user_id = p_user_id
  ) then
    raise exception 'workout plan not found';
  end if;

  if exists (
    select 1
    from public.workout_sessions
    where user_id = p_user_id and status in ('active', 'paused')
  ) then
    raise exception 'an active workout session already exists';
  end if;

  select count(*) into item_count
  from public.user_workout_plan_items item
  join public.user_workout_plan_sections section on section.id = item.section_id
  where section.plan_id = p_plan_id;

  if item_count = 0 then
    raise exception 'workout plan has no items';
  end if;

  insert into public.workout_sessions (
    user_id,
    source_plan_id,
    plan_name_snapshot,
    plan_description_snapshot,
    total_items
  )
  select p_user_id, id, name, description, item_count
  from public.user_workout_plans
  where id = p_plan_id and user_id = p_user_id
  returning id into new_session_id;

  insert into public.workout_session_sections (
    session_id,
    source_section_id,
    name_snapshot,
    sort_order
  )
  select new_session_id, id, name, sort_order
  from public.user_workout_plan_sections
  where plan_id = p_plan_id;

  insert into public.workout_session_items (
    session_id,
    section_id,
    source_plan_item_id,
    source_move_id,
    move_slug_snapshot,
    title_snapshot,
    instructions_snapshot,
    sets_snapshot,
    reps_snapshot,
    duration_seconds_snapshot,
    rest_seconds_snapshot,
    section_sort_order,
    item_sort_order,
    global_sort_order
  )
  select
    new_session_id,
    snapshot_section.id,
    item.id,
    item.move_id,
    move.slug,
    item.title,
    item.instructions,
    item.sets,
    item.reps,
    item.duration_seconds,
    item.rest_seconds,
    source_section.sort_order,
    item.sort_order,
    row_number() over (
      order by source_section.sort_order, item.sort_order
    )::integer - 1
  from public.user_workout_plan_items item
  join public.user_workout_plan_sections source_section
    on source_section.id = item.section_id
  join public.workout_session_sections snapshot_section
    on snapshot_section.session_id = new_session_id
    and snapshot_section.source_section_id = source_section.id
  left join public.moves move on move.id = item.move_id
  where source_section.plan_id = p_plan_id;

  return new_session_id;
end;
$$;

create or replace function public.set_user_workout_session_state(
  p_user_id uuid,
  p_session_id uuid,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.workout_sessions%rowtype;
  current_pause_seconds integer;
begin
  select * into current_session
  from public.workout_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'workout session not found';
  end if;

  if p_action = 'pause' then
    if current_session.status <> 'active' then
      raise exception 'only an active workout session can be paused';
    end if;
    update public.workout_sessions
    set status = 'paused', paused_at = now()
    where id = p_session_id;
  elsif p_action = 'resume' then
    if current_session.status <> 'paused' or current_session.paused_at is null then
      raise exception 'only a paused workout session can be resumed';
    end if;
    current_pause_seconds := greatest(
      0,
      floor(extract(epoch from (now() - current_session.paused_at)))::integer
    );
    update public.workout_sessions
    set
      status = 'active',
      paused_at = null,
      accumulated_pause_seconds = accumulated_pause_seconds + current_pause_seconds
    where id = p_session_id;
  elsif p_action = 'abandon' then
    if current_session.status not in ('active', 'paused') then
      raise exception 'only an open workout session can be abandoned';
    end if;
    current_pause_seconds := case
      when current_session.paused_at is null then 0
      else greatest(
        0,
        floor(extract(epoch from (now() - current_session.paused_at)))::integer
      )
    end;
    update public.workout_sessions
    set
      status = 'abandoned',
      paused_at = null,
      completed_at = now(),
      elapsed_seconds = greatest(
        0,
        floor(extract(epoch from (now() - current_session.started_at)))::integer
        - current_session.accumulated_pause_seconds
        - current_pause_seconds
      )
    where id = p_session_id;
  else
    raise exception 'unsupported workout session action';
  end if;

  return p_session_id;
end;
$$;

create or replace function public.progress_user_workout_session_item(
  p_user_id uuid,
  p_session_id uuid,
  p_item_id uuid,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.workout_sessions%rowtype;
  current_item public.workout_session_items%rowtype;
  target_sets integer;
  next_index integer;
  completed_count integer;
begin
  select * into current_session
  from public.workout_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'workout session not found';
  end if;
  if current_session.status <> 'active' then
    raise exception 'workout session is not active';
  end if;

  select * into current_item
  from public.workout_session_items
  where id = p_item_id and session_id = p_session_id
  for update;

  if not found or current_item.status <> 'pending' then
    raise exception 'pending workout item not found';
  end if;
  if current_item.global_sort_order <> current_session.current_item_index then
    raise exception 'only the current workout item can be updated';
  end if;

  if p_action = 'complete_set' then
    target_sets := coalesce(current_item.sets_snapshot, 1);
    if current_item.completed_sets + 1 < target_sets then
      update public.workout_session_items
      set completed_sets = completed_sets + 1
      where id = p_item_id;
      return p_session_id;
    end if;
    update public.workout_session_items
    set
      completed_sets = target_sets,
      status = 'completed',
      completed_at = now()
    where id = p_item_id;
  elsif p_action = 'skip' then
    update public.workout_session_items
    set status = 'skipped', completed_at = now()
    where id = p_item_id;
  else
    raise exception 'unsupported workout item action';
  end if;

  select min(global_sort_order) into next_index
  from public.workout_session_items
  where session_id = p_session_id and status = 'pending';

  select count(*) into completed_count
  from public.workout_session_items
  where session_id = p_session_id and status = 'completed';

  if next_index is null then
    update public.workout_sessions
    set
      status = 'completed',
      completed_at = now(),
      elapsed_seconds = greatest(
        0,
        floor(extract(epoch from (now() - started_at)))::integer
        - accumulated_pause_seconds
      ),
      current_item_index = total_items,
      completed_items = completed_count
    where id = p_session_id;
  else
    update public.workout_sessions
    set current_item_index = next_index, completed_items = completed_count
    where id = p_session_id;
  end if;

  return p_session_id;
end;
$$;

alter table public.workout_sessions enable row level security;
alter table public.workout_session_sections enable row level security;
alter table public.workout_session_items enable row level security;

grant select on public.workout_sessions,
  public.workout_session_sections,
  public.workout_session_items
to authenticated;

grant all on public.workout_sessions,
  public.workout_session_sections,
  public.workout_session_items
to service_role;

create policy "Users read their workout sessions"
on public.workout_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read sections in their workout sessions"
on public.workout_session_sections for select to authenticated
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = workout_session_sections.session_id
      and workout_sessions.user_id = (select auth.uid())
  )
);

create policy "Users read items in their workout sessions"
on public.workout_session_items for select to authenticated
using (
  exists (
    select 1 from public.workout_sessions
    where workout_sessions.id = workout_session_items.session_id
      and workout_sessions.user_id = (select auth.uid())
  )
);

revoke all on function public.start_user_workout_session(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.set_user_workout_session_state(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.progress_user_workout_session_item(uuid, uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.start_user_workout_session(uuid, uuid)
to service_role;
grant execute on function public.set_user_workout_session_state(uuid, uuid, text)
to service_role;
grant execute on function public.progress_user_workout_session_item(uuid, uuid, uuid, text)
to service_role;
