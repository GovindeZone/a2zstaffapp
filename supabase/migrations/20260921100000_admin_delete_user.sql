-- Allow the primary administrator to permanently delete non-admin users.
-- The existing single-admin model is preserved.

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the administrator can delete users';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'The administrator cannot delete their own account';
  end if;

  if not exists (select 1 from public.user_profiles where id = target_user_id) then
    raise exception 'User not found';
  end if;

  if exists (select 1 from public.user_profiles where id = target_user_id and role = 'admin') then
    raise exception 'The administrator account cannot be deleted';
  end if;

  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'User account not found';
  end if;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
