-- Member-owned video clips stay separate from the official editorial library.
-- Players remain admin-managed; members may only reference published players.

create table public.user_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  provider public.media_provider not null default 'mux',
  provider_upload_id text,
  provider_asset_id text,
  playback_id text,
  status public.media_status not null default 'pending',
  thumbnail_url text,
  duration_ms integer,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_clips_title_length check (char_length(title) between 1 and 120),
  constraint user_clips_description_length check (char_length(description) <= 2000),
  constraint user_clips_tag_count check (cardinality(tags) <= 8),
  constraint user_clips_video_mime check (mime_type like 'video/%'),
  constraint user_clips_file_size check (
    file_size_bytes > 0 and file_size_bytes <= 524288000
  ),
  constraint user_clips_duration check (duration_ms is null or duration_ms >= 0),
  constraint user_clips_provider_upload_unique unique (provider, provider_upload_id),
  constraint user_clips_provider_asset_unique unique (provider, provider_asset_id)
);

create table public.user_clip_players (
  clip_id uuid not null references public.user_clips (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (clip_id, player_id)
);

create index user_clips_owner_created_idx
  on public.user_clips (user_id, created_at desc);
create index user_clip_players_player_idx
  on public.user_clip_players (player_id, clip_id);

create trigger user_clips_set_updated_at
before update on public.user_clips
for each row execute function public.set_updated_at();

alter table public.user_clips enable row level security;
alter table public.user_clip_players enable row level security;

revoke all on public.user_clips, public.user_clip_players from anon, authenticated;
grant select, insert, update, delete on public.user_clips to authenticated;
grant select, insert, delete on public.user_clip_players to authenticated;
grant all on public.user_clips, public.user_clip_players to service_role;

create policy "Members read their clips"
on public.user_clips for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members create their clips"
on public.user_clips for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members update their clips"
on public.user_clips for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members delete their clips"
on public.user_clips for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Members read their clip player links"
on public.user_clip_players for select to authenticated
using (
  exists (
    select 1 from public.user_clips
    where user_clips.id = user_clip_players.clip_id
      and user_clips.user_id = (select auth.uid())
  )
);

create policy "Members tag published players on their clips"
on public.user_clip_players for insert to authenticated
with check (
  exists (
    select 1 from public.user_clips
    where user_clips.id = user_clip_players.clip_id
      and user_clips.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.players
    where players.id = user_clip_players.player_id
      and players.status = 'published'
  )
);

create policy "Members remove player tags from their clips"
on public.user_clip_players for delete to authenticated
using (
  exists (
    select 1 from public.user_clips
    where user_clips.id = user_clip_players.clip_id
      and user_clips.user_id = (select auth.uid())
  )
);
