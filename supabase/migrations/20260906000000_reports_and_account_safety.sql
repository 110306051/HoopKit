-- Safety workflow for production launch. Reports remain available to admins
-- even if the reporter or target owner later deletes their account.

create type public.content_report_target as enum (
  'user_clip',
  'move',
  'workout_template'
);

create type public.content_report_reason as enum (
  'inappropriate',
  'copyright',
  'misleading',
  'safety',
  'other'
);

create type public.content_report_status as enum (
  'pending',
  'reviewing',
  'resolved',
  'dismissed'
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references auth.users (id) on delete set null,
  target_type public.content_report_target not null,
  target_id uuid not null,
  target_owner_user_id uuid references auth.users (id) on delete set null,
  target_label text not null,
  reason public.content_report_reason not null,
  details text not null default '',
  status public.content_report_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_reports_target_label_length
    check (char_length(target_label) between 1 and 200),
  constraint content_reports_details_length check (char_length(details) <= 2000),
  constraint content_reports_resolution_notes_length
    check (char_length(resolution_notes) <= 2000),
  constraint content_reports_unique_report
    unique (reporter_user_id, target_type, target_id)
);

create index content_reports_review_queue_idx
  on public.content_reports (status, created_at asc);
create index content_reports_target_idx
  on public.content_reports (target_type, target_id);

create trigger content_reports_set_updated_at
before update on public.content_reports
for each row execute function public.set_updated_at();

alter table public.content_reports enable row level security;

revoke all on public.content_reports from anon, authenticated;
grant select, insert on public.content_reports to authenticated;
grant all on public.content_reports to service_role;

create policy "Members create reports as themselves"
on public.content_reports for insert to authenticated
with check ((select auth.uid()) = reporter_user_id);

create policy "Members read their reports"
on public.content_reports for select to authenticated
using ((select auth.uid()) = reporter_user_id);

create policy "Admins read all reports"
on public.content_reports for select to authenticated
using (public.has_app_role(array['admin'::public.app_role]));
