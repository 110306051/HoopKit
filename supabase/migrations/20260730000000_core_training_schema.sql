-- HoopKit core basketball content and workout schema.
-- Content editing is restricted to editor/admin roles. Personal workout data is
-- always scoped to the authenticated owner through row-level security (RLS).

create type public.app_role as enum ('user', 'editor', 'admin');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.player_position as enum (
  'point_guard',
  'shooting_guard',
  'small_forward',
  'power_forward',
  'center',
  'guard',
  'forward',
  'unknown'
);
create type public.move_difficulty as enum ('beginner', 'intermediate', 'advanced');
create type public.media_provider as enum ('mux', 'supabase', 'external');
create type public.media_status as enum ('pending', 'ready', 'errored');

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_roles is
  'Application authorization role. Authentication credentials remain in auth.users.';

create table public.players (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  full_name text not null,
  short_name text,
  bio text not null default '',
  position public.player_position not null default 'unknown',
  team_name text,
  nationality text,
  avatar_path text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint players_full_name_length check (char_length(full_name) between 1 and 100),
  constraint players_publish_state check (
    status <> 'published' or published_at is not null
  )
);

create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_categories_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint skill_categories_name_length check (char_length(name) between 1 and 80),
  constraint skill_categories_sort_order_check check (sort_order >= 0),
  constraint skill_categories_publish_state check (
    status <> 'published' or published_at is not null
  )
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tags_name_length check (char_length(name) between 1 and 50)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  provider public.media_provider not null,
  provider_asset_id text,
  playback_id text,
  kind text not null default 'video',
  status public.media_status not null default 'pending',
  source_url text,
  thumbnail_url text,
  duration_ms integer,
  width integer,
  height integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_duration_check check (
    duration_ms is null or duration_ms >= 0
  ),
  constraint media_assets_dimensions_check check (
    (width is null or width > 0) and (height is null or height > 0)
  ),
  constraint media_assets_provider_id_unique unique (provider, provider_asset_id)
);

comment on column public.media_assets.source_url is
  'Server-managed source reference. Clients should consume signed/playback URLs instead.';

create table public.moves (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.skill_categories (id) on delete restrict,
  slug text not null unique,
  name text not null,
  summary text not null default '',
  difficulty public.move_difficulty not null default 'beginner',
  how_to_use text not null default '',
  when_to_use text not null default '',
  coaching_cues text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  cover_asset_id uuid references public.media_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moves_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint moves_name_length check (char_length(name) between 1 and 100),
  constraint moves_publish_state check (
    status <> 'published' or published_at is not null
  )
);

create table public.move_players (
  move_id uuid not null references public.moves (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  relation text not null default 'demonstrated_by',
  sort_order integer not null default 0,
  primary key (move_id, player_id),
  constraint move_players_sort_order_check check (sort_order >= 0)
);

create table public.move_tags (
  move_id uuid not null references public.moves (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (move_id, tag_id)
);

create table public.highlight_clips (
  id uuid primary key default gen_random_uuid(),
  move_id uuid not null references public.moves (id) on delete cascade,
  player_id uuid references public.players (id) on delete set null,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  title text not null,
  start_ms integer not null default 0,
  end_ms integer not null,
  cover_time_ms integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint highlight_clips_time_range_check check (
    start_ms >= 0 and end_ms > start_ms
  ),
  constraint highlight_clips_cover_time_check check (
    cover_time_ms is null
    or (cover_time_ms >= start_ms and cover_time_ms <= end_ms)
  ),
  constraint highlight_clips_sort_order_check check (sort_order >= 0)
);

create table public.move_steps (
  id uuid primary key default gen_random_uuid(),
  move_id uuid not null references public.moves (id) on delete cascade,
  clip_id uuid references public.highlight_clips (id) on delete set null,
  title text not null,
  description text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint move_steps_title_length check (char_length(title) between 1 and 100),
  constraint move_steps_sort_order_check check (sort_order >= 0),
  constraint move_steps_move_position_unique unique (move_id, sort_order)
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  source_player_id uuid references public.players (id) on delete set null,
  slug text not null unique,
  name text not null,
  description text not null default '',
  warmup_notes text not null default '',
  difficulty public.move_difficulty not null default 'beginner',
  estimated_duration_minutes integer,
  cover_asset_id uuid references public.media_assets (id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_templates_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint workout_templates_name_length check (char_length(name) between 1 and 120),
  constraint workout_templates_duration_check check (
    estimated_duration_minutes is null or estimated_duration_minutes > 0
  ),
  constraint workout_templates_publish_state check (
    status <> 'published' or published_at is not null
  )
);

create table public.workout_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_template_sections_sort_order_check check (sort_order >= 0),
  constraint workout_template_sections_position_unique unique (template_id, sort_order)
);

create table public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.workout_template_sections (id) on delete cascade,
  move_id uuid references public.moves (id) on delete set null,
  title text not null,
  instructions text not null default '',
  sets integer,
  reps integer,
  duration_seconds integer,
  rest_seconds integer not null default 0,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_template_items_volume_check check (
    (sets is null or sets > 0)
    and (reps is null or reps > 0)
    and (duration_seconds is null or duration_seconds > 0)
    and rest_seconds >= 0
  ),
  constraint workout_template_items_has_work check (
    reps is not null or duration_seconds is not null
  ),
  constraint workout_template_items_position_unique unique (section_id, sort_order)
);

create table public.favorite_moves (
  user_id uuid not null references auth.users (id) on delete cascade,
  move_id uuid not null references public.moves (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, move_id)
);

create table public.favorite_workout_templates (
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

create table public.user_workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_template_id uuid references public.workout_templates (id) on delete set null,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_workout_plans_name_length check (char_length(name) between 1 and 120)
);

create table public.user_workout_plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.user_workout_plans (id) on delete cascade,
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_workout_plan_sections_sort_order_check check (sort_order >= 0),
  constraint user_workout_plan_sections_position_unique unique (plan_id, sort_order)
);

create table public.user_workout_plan_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.user_workout_plan_sections (id) on delete cascade,
  move_id uuid references public.moves (id) on delete set null,
  source_template_item_id uuid references public.workout_template_items (id) on delete set null,
  title text not null,
  instructions text not null default '',
  sets integer,
  reps integer,
  duration_seconds integer,
  rest_seconds integer not null default 0,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_workout_plan_items_volume_check check (
    (sets is null or sets > 0)
    and (reps is null or reps > 0)
    and (duration_seconds is null or duration_seconds > 0)
    and rest_seconds >= 0
  ),
  constraint user_workout_plan_items_has_work check (
    reps is not null or duration_seconds is not null
  ),
  constraint user_workout_plan_items_position_unique unique (section_id, sort_order)
);

-- Query-path indexes. Primary/unique keys already create their own indexes.
create index players_status_idx on public.players (status, published_at desc);
create index skill_categories_status_sort_idx
  on public.skill_categories (status, sort_order);
create index moves_category_status_idx
  on public.moves (category_id, status, published_at desc);
create index move_players_player_idx on public.move_players (player_id, sort_order);
create index move_tags_tag_idx on public.move_tags (tag_id);
create index highlight_clips_move_sort_idx
  on public.highlight_clips (move_id, sort_order);
create index move_steps_move_sort_idx on public.move_steps (move_id, sort_order);
create index workout_templates_player_status_idx
  on public.workout_templates (source_player_id, status, published_at desc);
create index workout_template_sections_template_sort_idx
  on public.workout_template_sections (template_id, sort_order);
create index workout_template_items_section_sort_idx
  on public.workout_template_items (section_id, sort_order);
create index favorite_moves_user_created_idx
  on public.favorite_moves (user_id, created_at desc);
create index favorite_workout_templates_user_created_idx
  on public.favorite_workout_templates (user_id, created_at desc);
create index user_workout_plans_user_updated_idx
  on public.user_workout_plans (user_id, updated_at desc);
create index user_workout_plan_sections_plan_sort_idx
  on public.user_workout_plan_sections (plan_id, sort_order);
create index user_workout_plan_items_section_sort_idx
  on public.user_workout_plan_items (section_id, sort_order);

-- Shared timestamp triggers.
create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();
create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();
create trigger skill_categories_set_updated_at
before update on public.skill_categories
for each row execute function public.set_updated_at();
create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();
create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();
create trigger moves_set_updated_at
before update on public.moves
for each row execute function public.set_updated_at();
create trigger highlight_clips_set_updated_at
before update on public.highlight_clips
for each row execute function public.set_updated_at();
create trigger move_steps_set_updated_at
before update on public.move_steps
for each row execute function public.set_updated_at();
create trigger workout_templates_set_updated_at
before update on public.workout_templates
for each row execute function public.set_updated_at();
create trigger workout_template_sections_set_updated_at
before update on public.workout_template_sections
for each row execute function public.set_updated_at();
create trigger workout_template_items_set_updated_at
before update on public.workout_template_items
for each row execute function public.set_updated_at();
create trigger user_workout_plans_set_updated_at
before update on public.user_workout_plans
for each row execute function public.set_updated_at();
create trigger user_workout_plan_sections_set_updated_at
before update on public.user_workout_plan_sections
for each row execute function public.set_updated_at();
create trigger user_workout_plan_items_set_updated_at
before update on public.user_workout_plan_items
for each row execute function public.set_updated_at();

-- Every Auth user receives the least-privileged application role by default.
create or replace function public.handle_new_auth_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_role_created
after insert on auth.users
for each row execute function public.handle_new_auth_user_role();

insert into public.user_roles (user_id, role)
select id, 'user'
from auth.users
on conflict (user_id) do nothing;

create or replace function public.has_app_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = any (allowed_roles)
  );
$$;

revoke all on function public.handle_new_auth_user_role() from public;
revoke all on function public.has_app_role(public.app_role[]) from public;
grant execute on function public.has_app_role(public.app_role[]) to anon, authenticated;

-- Enable RLS on every public table.
alter table public.user_roles enable row level security;
alter table public.players enable row level security;
alter table public.skill_categories enable row level security;
alter table public.tags enable row level security;
alter table public.media_assets enable row level security;
alter table public.moves enable row level security;
alter table public.move_players enable row level security;
alter table public.move_tags enable row level security;
alter table public.highlight_clips enable row level security;
alter table public.move_steps enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_sections enable row level security;
alter table public.workout_template_items enable row level security;
alter table public.favorite_moves enable row level security;
alter table public.favorite_workout_templates enable row level security;
alter table public.user_workout_plans enable row level security;
alter table public.user_workout_plan_sections enable row level security;
alter table public.user_workout_plan_items enable row level security;

-- Data API grants and RLS are both required. Grants expose only the SQL operations;
-- policies below decide which rows are visible or mutable.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.players, public.skill_categories, public.tags,
  public.moves, public.move_players, public.move_tags,
  public.highlight_clips, public.move_steps, public.workout_templates,
  public.workout_template_sections, public.workout_template_items
to anon, authenticated;

grant select (
  id,
  provider,
  playback_id,
  kind,
  status,
  thumbnail_url,
  duration_ms,
  width,
  height,
  created_at,
  updated_at
) on public.media_assets to anon, authenticated;

grant insert, update, delete on public.players, public.skill_categories,
  public.tags, public.media_assets, public.moves, public.move_players,
  public.move_tags, public.highlight_clips, public.move_steps,
  public.workout_templates, public.workout_template_sections,
  public.workout_template_items
to authenticated;

grant select on public.user_roles to authenticated;
grant insert, update, delete on public.user_roles to authenticated;
grant select, update on public.profiles to authenticated;

grant select, insert, delete on public.favorite_moves,
  public.favorite_workout_templates
to authenticated;

grant select, insert, update, delete on public.user_workout_plans,
  public.user_workout_plan_sections, public.user_workout_plan_items
to authenticated;

grant all on all tables in schema public to service_role;

-- Roles: users can see their own role; only admins can change authorization.
create policy "Users can read their own role"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins can read all roles"
on public.user_roles for select to authenticated
using (public.has_app_role(array['admin'::public.app_role]));

create policy "Admins can insert roles"
on public.user_roles for insert to authenticated
with check (public.has_app_role(array['admin'::public.app_role]));

create policy "Admins can update roles"
on public.user_roles for update to authenticated
using (public.has_app_role(array['admin'::public.app_role]))
with check (public.has_app_role(array['admin'::public.app_role]));

create policy "Admins can delete roles"
on public.user_roles for delete to authenticated
using (
  public.has_app_role(array['admin'::public.app_role])
  and user_id <> (select auth.uid())
);

-- Top-level published content is publicly readable. Editors/admins can preview
-- drafts and are the only roles allowed to mutate official content.
create policy "Published players are public"
on public.players for select to anon, authenticated
using (
  status = 'published'
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage players"
on public.players for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published categories are public"
on public.skill_categories for select to anon, authenticated
using (
  status = 'published'
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage categories"
on public.skill_categories for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Tags are public"
on public.tags for select to anon, authenticated
using (true);
create policy "Content roles manage tags"
on public.tags for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Ready media is public"
on public.media_assets for select to anon, authenticated
using (
  status = 'ready'
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage media"
on public.media_assets for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published moves are public"
on public.moves for select to anon, authenticated
using (
  status = 'published'
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage moves"
on public.moves for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published move-player links are public"
on public.move_players for select to anon, authenticated
using (
  exists (
    select 1 from public.moves
    where moves.id = move_players.move_id
      and moves.status = 'published'
  )
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage move-player links"
on public.move_players for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published move tags are public"
on public.move_tags for select to anon, authenticated
using (
  exists (
    select 1 from public.moves
    where moves.id = move_tags.move_id
      and moves.status = 'published'
  )
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage move tags"
on public.move_tags for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published highlight clips are public"
on public.highlight_clips for select to anon, authenticated
using (
  exists (
    select 1 from public.moves
    where moves.id = highlight_clips.move_id
      and moves.status = 'published'
  )
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage highlight clips"
on public.highlight_clips for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published move steps are public"
on public.move_steps for select to anon, authenticated
using (
  exists (
    select 1 from public.moves
    where moves.id = move_steps.move_id
      and moves.status = 'published'
  )
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage move steps"
on public.move_steps for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published workout templates are public"
on public.workout_templates for select to anon, authenticated
using (
  status = 'published'
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage workout templates"
on public.workout_templates for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published workout sections are public"
on public.workout_template_sections for select to anon, authenticated
using (
  exists (
    select 1 from public.workout_templates
    where workout_templates.id = workout_template_sections.template_id
      and workout_templates.status = 'published'
  )
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage workout sections"
on public.workout_template_sections for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

create policy "Published workout items are public"
on public.workout_template_items for select to anon, authenticated
using (
  exists (
    select 1
    from public.workout_template_sections
    join public.workout_templates
      on workout_templates.id = workout_template_sections.template_id
    where workout_template_sections.id = workout_template_items.section_id
      and workout_templates.status = 'published'
  )
  or public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role])
);
create policy "Content roles manage workout items"
on public.workout_template_items for all to authenticated
using (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]))
with check (public.has_app_role(array['editor'::public.app_role, 'admin'::public.app_role]));

-- Personal data policies. The user id comes from auth.uid(), never from trusted
-- client input alone.
create policy "Users manage their favorite moves"
on public.favorite_moves for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their favorite workout templates"
on public.favorite_workout_templates for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage their workout plans"
on public.user_workout_plans for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage sections in their workout plans"
on public.user_workout_plan_sections for all to authenticated
using (
  exists (
    select 1 from public.user_workout_plans
    where user_workout_plans.id = user_workout_plan_sections.plan_id
      and user_workout_plans.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.user_workout_plans
    where user_workout_plans.id = user_workout_plan_sections.plan_id
      and user_workout_plans.user_id = (select auth.uid())
  )
);

create policy "Users manage items in their workout plans"
on public.user_workout_plan_items for all to authenticated
using (
  exists (
    select 1
    from public.user_workout_plan_sections
    join public.user_workout_plans
      on user_workout_plans.id = user_workout_plan_sections.plan_id
    where user_workout_plan_sections.id = user_workout_plan_items.section_id
      and user_workout_plans.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.user_workout_plan_sections
    join public.user_workout_plans
      on user_workout_plans.id = user_workout_plan_sections.plan_id
    where user_workout_plan_sections.id = user_workout_plan_items.section_id
      and user_workout_plans.user_id = (select auth.uid())
  )
);
