-- Durable Google Sheets delivery queue. Supabase remains the source of truth;
-- this migration only adds retry/lease metadata and service-role-only RPCs.

alter table public.google_sheets_sync_queue
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists processing_started_at timestamptz,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists lock_token uuid,
  add column if not exists last_http_status integer;

create index if not exists google_sheets_sync_queue_claim_idx
  on public.google_sheets_sync_queue(next_attempt_at, created_at)
  where status = 'pending';

create index if not exists google_sheets_sync_queue_stale_processing_idx
  on public.google_sheets_sync_queue(lease_expires_at)
  where status = 'processing';

create or replace function public.claim_google_sheets_sync_jobs(p_limit integer default 1)
returns setof public.google_sheets_sync_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select q.id
    from public.google_sheets_sync_queue q
    where
      (q.status = 'pending' and q.next_attempt_at <= now())
      or (q.status = 'processing' and q.lease_expires_at <= now())
    order by q.next_attempt_at, q.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 10))
  )
  update public.google_sheets_sync_queue q
  set status = 'processing',
      attempts = q.attempts + 1,
      processing_started_at = now(),
      lease_expires_at = now() + interval '5 minutes',
      lock_token = gen_random_uuid(),
      last_attempt_at = now(),
      last_error = null,
      last_http_status = null
  from candidates
  where q.id = candidates.id
  returning q.*;
end;
$$;

create or replace function public.complete_google_sheets_sync_job(
  p_response_id uuid,
  p_lock_token uuid,
  p_http_status integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.google_sheets_sync_queue
  set status = 'synced',
      synced_at = now(),
      last_error = null,
      last_http_status = p_http_status,
      processing_started_at = null,
      lease_expires_at = null,
      lock_token = null
  where response_id = p_response_id
    and status = 'processing'
    and lock_token = p_lock_token;
  return found;
end;
$$;

create or replace function public.fail_google_sheets_sync_job(
  p_response_id uuid,
  p_lock_token uuid,
  p_error text,
  p_http_status integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  result_status text;
begin
  update public.google_sheets_sync_queue
  set status = case when attempts >= 12 then 'failed' else 'pending' end,
      next_attempt_at = case
        when attempts >= 12 then next_attempt_at
        else now() + make_interval(mins => least(360, power(2, greatest(attempts - 1, 0))::integer))
      end,
      last_error = left(coalesce(nullif(p_error, ''), 'Unknown sync error'), 1000),
      last_http_status = p_http_status,
      processing_started_at = null,
      lease_expires_at = null,
      lock_token = null
  where response_id = p_response_id
    and status = 'processing'
    and lock_token = p_lock_token
  returning status into result_status;

  return result_status;
end;
$$;

create or replace function public.retry_google_sheets_sync_job(p_response_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.google_sheets_sync_queue
  set status = 'pending', attempts = 0, next_attempt_at = now(),
      processing_started_at = null, lease_expires_at = null, lock_token = null,
      last_error = null, last_http_status = null, synced_at = null
  where response_id = p_response_id and status = 'failed';
  return found;
end;
$$;

create or replace function public.retry_failed_google_sheets_sync_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.google_sheets_sync_queue
  set status = 'pending', attempts = 0, next_attempt_at = now(),
      processing_started_at = null, lease_expires_at = null, lock_token = null,
      last_error = null, last_http_status = null, synced_at = null
  where status = 'failed';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.claim_google_sheets_sync_jobs(integer) from public, anon, authenticated;
revoke all on function public.complete_google_sheets_sync_job(uuid,uuid,integer) from public, anon, authenticated;
revoke all on function public.fail_google_sheets_sync_job(uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.retry_google_sheets_sync_job(uuid) from public, anon, authenticated;
revoke all on function public.retry_failed_google_sheets_sync_jobs() from public, anon, authenticated;

grant execute on function public.claim_google_sheets_sync_jobs(integer) to service_role;
grant execute on function public.complete_google_sheets_sync_job(uuid,uuid,integer) to service_role;
grant execute on function public.fail_google_sheets_sync_job(uuid,uuid,text,integer) to service_role;
grant execute on function public.retry_google_sheets_sync_job(uuid) to service_role;
grant execute on function public.retry_failed_google_sheets_sync_jobs() to service_role;
