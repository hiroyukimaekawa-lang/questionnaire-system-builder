-- Additive signup approval flow. Existing profiles remain active; new profiles await approval.

alter table public.profiles add column if not exists is_active boolean;

update public.profiles
set is_active = true
where is_active is null;

alter table public.profiles alter column is_active set default false;
alter table public.profiles alter column is_active set not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,name,email,role,is_active)
  values(new.id,coalesce(new.raw_user_meta_data->>'name',''),coalesce(new.email,''),'sales',false);
  return new;
end
$$;

create or replace function public.is_staff() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','sales') and is_active = true
  )
$$;

create or replace function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  )
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
