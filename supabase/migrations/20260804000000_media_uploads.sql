alter table public.media_assets
  add column title text not null default '未命名媒體',
  add column original_filename text,
  add column mime_type text,
  add column file_size_bytes bigint,
  add column error_message text,
  add constraint media_assets_title_length check (char_length(title) between 1 and 120),
  add constraint media_assets_file_size_check check (
    file_size_bytes is null or file_size_bytes > 0
  ),
  add constraint media_assets_kind_check check (kind in ('image', 'video'));

-- Public editorial images are served directly to the Admin and Mobile apps.
-- Upload/delete still require authorization; the API grants a short-lived,
-- one-file signed upload token and keeps the service-role key server-side.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'content-images',
  'content-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

