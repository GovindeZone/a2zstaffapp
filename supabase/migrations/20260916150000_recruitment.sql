-- Recruitment candidate enquiries, unique phone numbers, and per-tab access.
create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null check (length(trim(candidate_name)) > 0),
  phone_number text not null check (phone_number ~ '^[0-9]{10}$'),
  enquiry_date date not null,
  job_type text not null check (job_type in ('Full time', 'Part time')),
  enquiry_status text not null check (enquiry_status in (
    'Interested', 'Not Interested', 'Busy/Unreachable', 'Interviewed',
    'Interviewed - Not Joined', 'Joined/Hired'
  )),
  enquiry_remarks text not null check (length(trim(enquiry_remarks)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_candidates_phone_unique unique (phone_number)
);

create index if not exists recruitment_candidates_status_idx
  on public.recruitment_candidates(enquiry_status);
create index if not exists recruitment_candidates_enquiry_date_idx
  on public.recruitment_candidates(enquiry_date desc);

alter table public.recruitment_candidates enable row level security;

drop policy if exists "Approved recruitment users manage candidates" on public.recruitment_candidates;
create policy "Approved recruitment users manage candidates"
on public.recruitment_candidates for all to authenticated
using (public.is_approved() and (public.is_admin() or 'recruitment' = any((select allowed_tabs from public.user_profiles where id = auth.uid()))))
with check (public.is_approved() and (public.is_admin() or 'recruitment' = any((select allowed_tabs from public.user_profiles where id = auth.uid()))));

create or replace function public.touch_recruitment_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recruitment_candidates_touch_updated_at on public.recruitment_candidates;
create trigger recruitment_candidates_touch_updated_at
before update on public.recruitment_candidates
for each row execute function public.touch_recruitment_updated_at();

grant select, insert, update, delete on public.recruitment_candidates to authenticated;

-- Add Recruitment to the list of administrator-controlled tabs and make it
-- available for initial administrators. Existing user permissions are preserved.
update public.user_profiles
set allowed_tabs = array_append(allowed_tabs, 'recruitment')
where role = 'admin'
  and not ('recruitment' = any(allowed_tabs));

-- Allow the administrator to assign Recruitment access to Users.
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

  select * into target from public.user_profiles where id = target_user_id for update;
  if not found then raise exception 'User not found'; end if;
  if target.status <> 'approved' then raise exception 'The new administrator must be an approved user'; end if;

  update public.user_profiles
  set role = 'user',
      allowed_tabs = array(select x from unnest(allowed_tabs) as x where x <> 'user_control')
  where role = 'admin';

  update public.user_profiles
  set role = 'admin', status = 'approved',
      allowed_tabs = array['dashboard','employees','attendance','salary','recruitment','user_control']::text[]
  where id = target_user_id
  returning * into target;

  return target;
end;
$$;

grant execute on function public.transfer_admin(uuid) to authenticated;
