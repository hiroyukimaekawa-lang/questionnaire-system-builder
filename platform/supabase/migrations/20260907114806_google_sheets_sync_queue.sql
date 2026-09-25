-- Phase 1 of the dual-write data pipeline.
-- Supabase remains the source of truth. Every saved response is queued for
-- optional Google Sheets export so an integration outage never loses answers.

create table if not exists public.google_sheets_sync_queue (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.responses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','synced','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  last_attempt_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_sheets_sync_queue_status_idx
  on public.google_sheets_sync_queue(status, created_at);

create or replace function public.enqueue_google_sheets_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.google_sheets_sync_queue(response_id)
  values (new.id)
  on conflict (response_id) do nothing;
  return new;
end;
$$;

drop trigger if exists responses_google_sheets_enqueue on public.responses;
create trigger responses_google_sheets_enqueue
after insert on public.responses
for each row execute function public.enqueue_google_sheets_response();

drop trigger if exists google_sheets_sync_queue_touch on public.google_sheets_sync_queue;
create trigger google_sheets_sync_queue_touch
before update on public.google_sheets_sync_queue
for each row execute function public.touch_updated_at();

-- Queue historical responses too. This makes the first live sync capable of
-- exporting responses that arrived before Google Sheets was connected.
insert into public.google_sheets_sync_queue(response_id)
select id from public.responses
on conflict (response_id) do nothing;

alter table public.google_sheets_sync_queue enable row level security;

drop policy if exists google_sheets_sync_queue_staff_read on public.google_sheets_sync_queue;
create policy google_sheets_sync_queue_staff_read
on public.google_sheets_sync_queue
for select
to authenticated
using (public.is_staff());

-- No public insert/update/delete policy is intentionally provided. Queue writes
-- are performed by the database trigger; later sync workers must use a narrowly
-- scoped server-side mechanism rather than exposing queue mutation to browsers.
