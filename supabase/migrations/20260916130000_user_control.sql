
-- User roles, approval, and per-tab access control
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  allowed_tabs text[] not null default array['dashboard']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_profiles_status_idx on public.user_profiles(status);
create index user_profiles_role_idx on public.user_profiles(role);

alter table public.user_profiles enable row level security;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_profiles
    where id = check_user_id and role = 'admin' and status = 'approved'
  );
$$;

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

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_approved(uuid) to authenticated;

create policy "Users read own profile"
on public.user_profiles for select to authenticated
using (id = auth.uid());

create policy "Admins read all profiles"
on public.user_profiles for select to authenticated
using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_admin boolean;
  display_name text;
begin
  -- Serialize first-user creation so exactly one user can become the initial admin.
  perform pg_advisory_xact_lock(hashtextextended('a_to_z_first_admin', 0));

  select not exists (
    select 1 from public.user_profiles where role = 'admin'
  ) into first_admin;

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  );

  insert into public.user_profiles (
    id, email, full_name, role, status, allowed_tabs
  )
  values (
    new.id,
    coalesce(new.email, ''),
    display_name,
    case when first_admin then 'admin' else 'user' end,
    case when first_admin then 'approved' else 'pending' end,
    case when first_admin
      then array['dashboard','employees','attendance','salary','user_control']::text[]
      else array['dashboard']::text[]
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_user_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_touch_updated_at
before update on public.user_profiles
for each row execute function public.touch_user_profile_updated_at();

grant select on public.user_profiles to authenticated;
grant all on public.user_profiles to service_role;

-- Admin-only operation for approving/rejecting users and assigning tab access.
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

  if new_status is not null and new_status not in ('pending','approved','rejected') then
    raise exception 'Invalid user status';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Use administrator transfer to change administrator access';
  end if;

  update public.user_profiles
  set
    status = coalesce(new_status, status),
    allowed_tabs = case
      when new_allowed_tabs is null then allowed_tabs
      else array(
        select distinct x
        from unnest(new_allowed_tabs) as x
        where x = any(array['dashboard','employees','attendance','salary']::text[])
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

-- Only one administrator is maintained. Transferring admin rights demotes
-- the current administrator to a normal approved user.
create or replace function public.transfer_admin(target_user_id uuid)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.user_profiles;
begin
  if not public.is_admin() then
    raise exception 'Only the current administrator can transfer administrator rights';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You are already the administrator';
  end if;

  select * into target
  from public.user_profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if target.status <> 'approved' then
    raise exception 'The new administrator must be an approved user';
  end if;

  update public.user_profiles
  set role = 'user',
      allowed_tabs = array(
        select x
        from unnest(allowed_tabs) as x
        where x <> 'user_control'
      )
  where role = 'admin';

  update public.user_profiles
  set role = 'admin',
      status = 'approved',
      allowed_tabs = array['dashboard','employees','attendance','salary','user_control']::text[]
  where id = target_user_id
  returning * into target;

  return target;
end;
$$;

grant execute on function public.transfer_admin(uuid) to authenticated;

-- Approved users may use the HR data. Pending/rejected users cannot.
drop policy if exists "Signed-in staff manage employees" on public.employees;
create policy "Approved staff manage employees"
on public.employees for all to authenticated
using (public.is_approved())
with check (public.is_approved());

drop policy if exists "Signed-in staff manage attendance" on public.attendance;
create policy "Approved staff manage attendance"
on public.attendance for all to authenticated
using (public.is_approved())
with check (public.is_approved());

drop policy if exists "Signed-in staff manage documents" on public.employee_documents;
create policy "Approved staff manage documents"
on public.employee_documents for all to authenticated
using (public.is_approved())
with check (public.is_approved());

drop policy if exists "Staff read employee documents" on storage.objects;
create policy "Approved staff read employee documents"
on storage.objects for select to authenticated
using (bucket_id = 'employee-documents' and public.is_approved());

drop policy if exists "Staff upload employee documents" on storage.objects;
create policy "Approved staff upload employee documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'employee-documents' and public.is_approved());

drop policy if exists "Staff update employee documents" on storage.objects;
create policy "Approved staff update employee documents"
on storage.objects for update to authenticated
using (bucket_id = 'employee-documents' and public.is_approved());

drop policy if exists "Staff delete employee documents" on storage.objects;
create policy "Approved staff delete employee documents"
on storage.objects for delete to authenticated
using (bucket_id = 'employee-documents' and public.is_approved());


-- Backfill existing authentication accounts. The earliest existing account becomes
-- the initial administrator; all later accounts require approval.
insert into public.user_profiles (id, email, full_name, role, status, allowed_tabs)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(u.raw_user_meta_data ->> 'name'), '')),
  case when row_number() over (order by u.created_at, u.id) = 1 then 'admin' else 'user' end,
  case when row_number() over (order by u.created_at, u.id) = 1 then 'approved' else 'pending' end,
  case when row_number() over (order by u.created_at, u.id) = 1
    then array['dashboard','employees','attendance','salary','user_control']::text[]
    else array['dashboard']::text[]
  end
from auth.users u
where not exists (select 1 from public.user_profiles p where p.id = u.id);
