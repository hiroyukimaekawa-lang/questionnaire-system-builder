-- Persistence for the internal Help/Improvement assistant's confirmed Improvement
-- Requests only (see docs/INTERNAL_ASSISTANT.md). A plain "help" answer never
-- creates a row here - only an explicit "改善要望として送る" tap does, via
-- POST /api/internal-assistant/improvements.
--
-- Not applied to Production by this PR. Forward-only, additive migration.

create table public.improvement_requests (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles(id),
  status text not null default 'submitted' check (status in ('submitted','triaging','ready_for_dev','in_progress','resolved','closed')),
  category text not null check (category in ('bug','ux_improvement','feature_request')),
  message text not null,
  proposal jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same reporter can't double-submit under the same idempotency key. NULLs (no key
-- supplied) are not constrained against each other, which is standard Postgres
-- unique-index behavior and matches "no key, no idempotency guarantee".
create unique index improvement_requests_reporter_idempotency_idx
  on public.improvement_requests(reporter_user_id, idempotency_key)
  where idempotency_key is not null;

create index improvement_requests_reporter_status_idx on public.improvement_requests(reporter_user_id, status, created_at desc);
create index improvement_requests_status_idx on public.improvement_requests(status, created_at desc);

alter table public.improvement_requests enable row level security;

-- admin: full read. sales: only their own submissions. viewer/anon: no policy, no access.
create policy improvement_requests_select on public.improvement_requests for select to authenticated
  using (reporter_user_id = auth.uid() or public.is_admin());

-- admin or sales may create a request, but only attributed to themselves - the API
-- route also always sets reporter_user_id from the authenticated session, never
-- from client input, so this check is defense in depth against a direct RPC/REST call.
create policy improvement_requests_insert on public.improvement_requests for insert to authenticated
  with check (public.is_staff() and reporter_user_id = auth.uid());

-- status/triage fields are admin-only; the reporter can read their own row but not
-- edit it after submitting (matches "trusted server" intent without granting
-- service-role-only access).
create policy improvement_requests_update on public.improvement_requests for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create trigger improvement_requests_touch before update on public.improvement_requests
  for each row execute function public.touch_updated_at();

-- Never intended for anonymous/public respondents at all (unlike surveys, this has
-- no "published" concept) - revoke table-level privilege outright rather than
-- relying on RLS alone, matching survey_members/survey_invitations.
revoke all on table public.improvement_requests from anon;
grant select, insert, update on table public.improvement_requests to authenticated;
