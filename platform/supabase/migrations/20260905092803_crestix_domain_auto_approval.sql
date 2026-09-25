-- Crestix-domain auto-approval. Manual admin approval is no longer required for
-- @crestix-inc.com signups; every other domain is rejected at signup time.
-- Additive: existing admins are untouched, and only role='sales' rows that already
-- match the trusted domain are backfilled to active.

create or replace function public.is_crestix_email(p_email text) returns boolean
language sql
immutable
as $$
  -- Extracts everything after the LAST '@' (robust against "user@crestix-inc.com.evil.com"
  -- and "crestix-inc.com@evil.com" style spoofing) and compares the full domain, not a substring.
  select lower(substring(coalesce(p_email,'') from '@([^@]+)$')) = 'crestix-inc.com'
$$;

revoke all on function public.is_crestix_email(text) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_crestix_email(new.email) then
    raise exception 'このメールドメインでは登録できません。'
      using errcode = 'P0001';
  end if;
  insert into public.profiles(id,name,email,role,is_active)
  values(new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,''),'sales',true);
  return new;
end
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Safe by construction: role='sales' can never match an admin row, and
-- is_crestix_email() is the exact same check now applied to new signups,
-- so this only activates accounts that would already have been auto-approved.
update public.profiles
set is_active = true
where role = 'sales'
  and is_active = false
  and public.is_crestix_email(email);
