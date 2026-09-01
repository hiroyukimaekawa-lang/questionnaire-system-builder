create type public.builder_session_status as enum ('in_progress', 'completed', 'cancelled');

create table public.builder_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  survey_id uuid references public.surveys(id),
  status public.builder_session_status not null default 'in_progress',
  context jsonb not null default '{}'::jsonb,
  current_step text not null default 'purpose',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index builder_sessions_user_status_idx on public.builder_sessions(user_id, status, updated_at desc);
alter table public.builder_sessions enable row level security;
create policy builder_sessions_own on public.builder_sessions for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create trigger builder_sessions_touch before update on public.builder_sessions
  for each row execute function public.touch_updated_at();
