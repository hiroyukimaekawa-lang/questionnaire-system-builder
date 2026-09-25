-- Additive management, sharing, invitation, analytics, and RLS layer.
-- Existing surveys, public URLs, responses, and builder data are preserved.

create type public.survey_member_permission as enum ('editor', 'viewer');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'suspended');

create table public.survey_members (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission public.survey_member_permission not null,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_id, user_id)
);

create table public.survey_invitations (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  permission public.survey_member_permission not null default 'viewer',
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references public.profiles(id),
  invited_user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index survey_invitations_active_email_idx
  on public.survey_invitations (survey_id, email)
  where status in ('pending', 'accepted');
create index if not exists surveys_owner_user_id_idx on public.surveys(owner_user_id);
create index if not exists survey_members_user_survey_idx on public.survey_members(user_id, survey_id);
create index if not exists survey_members_survey_user_idx on public.survey_members(survey_id, user_id);
create index if not exists responses_survey_submitted_idx on public.responses(survey_id, submitted_at desc);
create index survey_invitations_status_idx on public.survey_invitations(status, created_at desc);

create trigger survey_members_touch before update on public.survey_members
for each row execute function public.touch_updated_at();
create trigger survey_invitations_touch before update on public.survey_invitations
for each row execute function public.touch_updated_at();

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_admin_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin' and is_active = true
  )
$$;

create or replace function private.can_view_survey_for(p_survey_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and is_active = true
  ) and (
    private.is_admin_user(p_user_id)
    or exists (
      select 1 from public.surveys
      where id = p_survey_id and owner_user_id = p_user_id
    )
    or exists (
      select 1 from public.survey_members
      where survey_id = p_survey_id and user_id = p_user_id
    )
  )
$$;

create or replace function private.can_edit_survey_for(p_survey_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and is_active = true
  ) and (
    private.is_admin_user(p_user_id)
    or exists (
      select 1 from public.surveys
      where id = p_survey_id and owner_user_id = p_user_id
    )
    or exists (
      select 1 from public.survey_members
      where survey_id = p_survey_id and user_id = p_user_id and permission = 'editor'
    )
  )
$$;

create or replace function private.can_manage_survey_members_for(p_survey_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and is_active = true
  ) and (
    private.is_admin_user(p_user_id)
    or exists (
      select 1 from public.surveys
      where id = p_survey_id and owner_user_id = p_user_id
    )
  )
$$;

revoke all on function private.is_admin_user(uuid) from public, anon;
revoke all on function private.can_view_survey_for(uuid, uuid) from public, anon;
revoke all on function private.can_edit_survey_for(uuid, uuid) from public, anon;
revoke all on function private.can_manage_survey_members_for(uuid, uuid) from public, anon;
grant execute on function private.is_admin_user(uuid) to authenticated;
grant execute on function private.can_view_survey_for(uuid, uuid) to authenticated;
grant execute on function private.can_edit_survey_for(uuid, uuid) to authenticated;
grant execute on function private.can_manage_survey_members_for(uuid, uuid) to authenticated;

create or replace function public.can_view_survey(p_survey_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.can_view_survey_for(p_survey_id, (select auth.uid()))
$$;
create or replace function public.can_edit_survey(p_survey_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.can_edit_survey_for(p_survey_id, (select auth.uid()))
$$;
revoke all on function public.can_view_survey(uuid) from public, anon;
revoke all on function public.can_edit_survey(uuid) from public, anon;
grant execute on function public.can_view_survey(uuid) to authenticated;
grant execute on function public.can_edit_survey(uuid) to authenticated;

create or replace function public.can_manage_survey_members(p_survey_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.can_manage_survey_members_for(p_survey_id, (select auth.uid()))
$$;
revoke all on function public.can_manage_survey_members(uuid) from public, anon;
grant execute on function public.can_manage_survey_members(uuid) to authenticated;

alter table public.survey_members enable row level security;
alter table public.survey_invitations enable row level security;
revoke all on table public.survey_members, public.survey_invitations from anon;
grant select, insert, update, delete on table public.survey_members, public.survey_invitations to authenticated;

create policy survey_members_read on public.survey_members for select to authenticated
using (private.can_view_survey_for(survey_id, (select auth.uid())));
create policy survey_members_insert on public.survey_members for insert to authenticated
with check (private.can_manage_survey_members_for(survey_id, (select auth.uid())));
create policy survey_members_update on public.survey_members for update to authenticated
using (private.can_manage_survey_members_for(survey_id, (select auth.uid())))
with check (private.can_manage_survey_members_for(survey_id, (select auth.uid())));
create policy survey_members_delete on public.survey_members for delete to authenticated
using (private.can_manage_survey_members_for(survey_id, (select auth.uid())));

create policy profiles_shared_member_read on public.profiles for select to authenticated using (
  exists (
    select 1 from public.survey_members sm
    where sm.user_id = profiles.id
      and private.can_manage_survey_members_for(sm.survey_id, (select auth.uid()))
  )
);

create policy survey_invitations_read on public.survey_invitations for select to authenticated
using (private.can_manage_survey_members_for(survey_id, (select auth.uid())));
create policy survey_invitations_insert on public.survey_invitations for insert to authenticated
with check (private.can_manage_survey_members_for(survey_id, (select auth.uid())) and invited_by = (select auth.uid()));
create policy survey_invitations_update on public.survey_invitations for update to authenticated
using (private.can_manage_survey_members_for(survey_id, (select auth.uid())))
with check (private.can_manage_survey_members_for(survey_id, (select auth.uid())));
create policy survey_invitations_delete on public.survey_invitations for delete to authenticated
using (private.can_manage_survey_members_for(survey_id, (select auth.uid())));

drop policy if exists surveys_staff_all on public.surveys;
create policy surveys_read on public.surveys for select to authenticated
using (private.can_view_survey_for(id, (select auth.uid())));
create policy surveys_insert on public.surveys for insert to authenticated
with check (public.is_staff() and owner_user_id = (select auth.uid()));
create policy surveys_update on public.surveys for update to authenticated
using (private.can_edit_survey_for(id, (select auth.uid())))
with check (private.can_edit_survey_for(id, (select auth.uid())));
create policy surveys_delete on public.surveys for delete to authenticated
using (private.is_admin_user((select auth.uid())));

drop policy if exists versions_staff_all on public.survey_versions;
create policy versions_read on public.survey_versions for select to authenticated
using (private.can_view_survey_for(survey_id, (select auth.uid())));
create policy versions_insert on public.survey_versions for insert to authenticated
with check (private.can_edit_survey_for(survey_id, (select auth.uid())));
create policy versions_update on public.survey_versions for update to authenticated
using (private.can_edit_survey_for(survey_id, (select auth.uid())))
with check (private.can_edit_survey_for(survey_id, (select auth.uid())));
create policy versions_delete on public.survey_versions for delete to authenticated
using (private.can_edit_survey_for(survey_id, (select auth.uid())));

drop policy if exists questions_staff_all on public.questions;
create policy questions_read on public.questions for select to authenticated using (
  exists (select 1 from public.survey_versions v where v.id = survey_version_id and private.can_view_survey_for(v.survey_id, (select auth.uid())))
);
create policy questions_write on public.questions for all to authenticated using (
  exists (select 1 from public.survey_versions v where v.id = survey_version_id and private.can_edit_survey_for(v.survey_id, (select auth.uid())))
) with check (
  exists (select 1 from public.survey_versions v where v.id = survey_version_id and private.can_edit_survey_for(v.survey_id, (select auth.uid())))
);

drop policy if exists options_staff_all on public.question_options;
create policy options_read on public.question_options for select to authenticated using (
  exists (select 1 from public.questions q join public.survey_versions v on v.id = q.survey_version_id where q.id = question_id and private.can_view_survey_for(v.survey_id, (select auth.uid())))
);
create policy options_write on public.question_options for all to authenticated using (
  exists (select 1 from public.questions q join public.survey_versions v on v.id = q.survey_version_id where q.id = question_id and private.can_edit_survey_for(v.survey_id, (select auth.uid())))
) with check (
  exists (select 1 from public.questions q join public.survey_versions v on v.id = q.survey_version_id where q.id = question_id and private.can_edit_survey_for(v.survey_id, (select auth.uid())))
);

drop policy if exists responses_staff_read on public.responses;
create policy responses_member_read on public.responses for select to authenticated
using (private.can_view_survey_for(survey_id, (select auth.uid())));
drop policy if exists answers_staff_read on public.response_answers;
create policy answers_member_read on public.response_answers for select to authenticated using (
  exists (select 1 from public.responses r where r.id = response_id and private.can_view_survey_for(r.survey_id, (select auth.uid())))
);

drop policy if exists builder_sessions_own on public.builder_sessions;
create policy builder_sessions_read on public.builder_sessions for select to authenticated using (
  user_id = (select auth.uid()) or public.is_admin() or (survey_id is not null and private.can_edit_survey_for(survey_id, (select auth.uid())))
);
create policy builder_sessions_write on public.builder_sessions for all to authenticated using (
  user_id = (select auth.uid()) or public.is_admin() or (survey_id is not null and private.can_edit_survey_for(survey_id, (select auth.uid())))
) with check (
  user_id = (select auth.uid()) or public.is_admin() or (survey_id is not null and private.can_edit_survey_for(survey_id, (select auth.uid())))
);

-- Invitation-aware profile creation: Crestix signups stay unchanged; external
-- accounts can only be created when a pending invitation already exists.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_internal boolean; v_invitation public.survey_invitations;
begin
  v_internal := public.is_crestix_email(new.email);
  if not v_internal then
    select * into v_invitation from public.survey_invitations
    where email = lower(trim(new.email)) and status = 'pending' and expires_at > now()
    order by created_at desc limit 1;
    if v_invitation.id is null then
      raise exception '招待が確認できません。' using errcode = 'P0001';
    end if;
  end if;
  insert into public.profiles(id,name,email,role,is_active)
  values(new.id, coalesce(new.raw_user_meta_data->>'name',''), coalesce(new.email,''), case when v_internal then 'sales'::public.user_role else 'viewer'::public.user_role end, true);
  -- Membership and accepted state are created only after verifyOtp succeeds in
  -- /auth/confirm. auth.users creation alone is not acceptance.
  return new;
end
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
alter function public.is_crestix_email(text) set search_path = '';

create or replace function public.get_survey_analytics(
  p_survey_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_question_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not public.can_view_survey(p_survey_id) then raise exception '権限がありません'; end if;
  with filtered as (
    select * from public.responses r where r.survey_id=p_survey_id
      and (p_from is null or r.submitted_at >= p_from)
      and (p_to is null or r.submitted_at < p_to)
  ), rating_answers as (
    select a.question_id,a.value_number,f.submitted_at
    from filtered f join public.response_answers a on a.response_id=f.id
    join public.questions q on q.id=a.question_id
    where q.type='rating_10' and a.value_number is not null
      and (p_question_id is null or a.question_id=p_question_id)
  )
  select jsonb_build_object(
    'totalResponseCount',(select count(*) from public.responses where survey_id=p_survey_id),
    'responseCount',(select count(*) from filtered),
    'todayCount',(select count(*) from filtered where (submitted_at at time zone 'Asia/Tokyo')::date=(now() at time zone 'Asia/Tokyo')::date),
    'averageScore',(select round(avg(value_number),2) from rating_answers),
    'daily',coalesce((select jsonb_agg(jsonb_build_object('date',day,'count',count) order by day) from (select (submitted_at at time zone 'Asia/Tokyo')::date day,count(*) count from filtered group by 1) d),'[]'::jsonb),
    'scoreDistribution',coalesce((select jsonb_agg(jsonb_build_object('score',score,'count',count) order by score desc) from (select value_number score,count(*) count from rating_answers group by 1) s),'[]'::jsonb),
    'latest',coalesce((select jsonb_agg(row_data order by submitted_at desc) from (select submitted_at,jsonb_build_object('id',id,'submittedAt',submitted_at,'totalScore',total_score,'averageScore',average_score) row_data from filtered order by submitted_at desc limit 5) l),'[]'::jsonb)
  ) into result;
  return result;
end
$$;
revoke all on function public.get_survey_analytics(uuid,timestamptz,timestamptz,uuid) from public, anon;
grant execute on function public.get_survey_analytics(uuid,timestamptz,timestamptz,uuid) to authenticated;

revoke execute on function public.mark_google_sheets_sync_result(uuid,text,text,text) from anon;
