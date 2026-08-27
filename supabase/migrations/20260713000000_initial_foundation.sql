-- HoopKit database foundation.
-- All public tables must explicitly enable RLS and grant only required access.

create type public.user_status as enum ('active', 'suspended', 'deleted');
create type public.dominant_hand as enum ('left', 'right', 'both');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text not null default '',
  avatar_path text,
  preferred_language text not null default 'zh-TW',
  timezone text not null default 'Asia/Taipei',
  dominant_hand public.dominant_hand,
  skill_level public.skill_level,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (
    username is null or char_length(username) between 3 and 30
  ),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]+$'
  ),
  constraint profiles_display_name_length check (
    char_length(display_name) <= 50
  )
);

comment on table public.profiles is
  'Application profile associated one-to-one with a Supabase Auth user.';

create index profiles_status_idx on public.profiles (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 50)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and status = 'active'
);

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_auth_user() from public;
