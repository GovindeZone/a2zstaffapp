-- Add a temporary disabled state for non-admin users.
-- Disabled users keep their account and data but cannot access the application.

alter table public.user_profiles
  drop constraint if exists user_profiles_status_check;

alter table public.user_profiles
  add constraint user_profiles_status_check
  check (status in ('pending','approved','rejected','disabled'));

create or replace function public.admin_update_user(
  target_user_id uuid,
  new_status text default null,
  new_allowed_tabs text[] default null
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.user_profiles;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can manage users';
  end if;

  if new_status is not null and new_status not in ('pending','approved','rejected','disabled') then
    raise exception 'Invalid user status';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'The administrator account cannot be disabled or changed here';
  end if;

  if exists (
    select 1 from public.user_profiles
    where id = target_user_id and role = 'admin'
  ) then
    raise exception 'The administrator account cannot be disabled or changed here';
  end if;

  update public.user_profiles
  set
    status = coalesce(new_status, status),
    allowed_tabs = case
      when new_allowed_tabs is null then allowed_tabs
      else array(
        select distinct x
        from unnest(new_allowed_tabs) as x
        where x = any(array['dashboard','employees','attendance','salary','recruitment']::text[])
      )
    end
  where id = target_user_id
  returning * into target;

  if not found then
    raise exception 'User not found';
  end if;

  return target;
end;
$$;

grant execute on function public.admin_update_user(uuid,text,text[]) to authenticated;

create or replace function public.is_approved(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_profiles
    where id = check_user_id and status = 'approved'
  );
$$;

grant execute on function public.is_approved(uuid) to authenticated;
