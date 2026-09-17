CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  allowed_tabs text[] NOT NULL DEFAULT ARRAY['dashboard']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT USAGE ON TYPE public.app_role TO authenticated, service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX user_profiles_status_idx ON public.user_profiles(status);
CREATE INDEX user_roles_role_idx ON public.user_roles(role);

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  ) AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = check_user_id AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = check_user_id AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;

CREATE POLICY "Users read own profile"
ON public.user_profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins read all profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Users read own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  allowed_tabs text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  first_admin boolean;
  jwt_email text;
  jwt_name text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('a_to_z_first_admin', 0));
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.role = 'admin') INTO first_admin;

  jwt_email := coalesce(auth.jwt() ->> 'email', '');
  jwt_name := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), '')
  );

  INSERT INTO public.user_profiles (id, email, full_name, status, allowed_tabs)
  VALUES (
    current_user_id,
    jwt_email,
    jwt_name,
    CASE WHEN first_admin THEN 'approved' ELSE 'pending' END,
    CASE WHEN first_admin
      THEN ARRAY['dashboard','employees','attendance','salary','recruitment','user_control']::text[]
      ELSE ARRAY['dashboard']::text[]
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = CASE WHEN excluded.email <> '' THEN excluded.email ELSE user_profiles.email END,
    full_name = coalesce(excluded.full_name, user_profiles.full_name);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, CASE WHEN first_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, r.role::text, p.status, p.allowed_tabs, p.created_at, p.updated_at
  FROM public.user_profiles p
  JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.id = current_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  allowed_tabs text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can manage users';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, r.role::text, p.status, p.allowed_tabs, p.created_at, p.updated_at
  FROM public.user_profiles p
  JOIN public.user_roles r ON r.user_id = p.id
  ORDER BY p.created_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id uuid,
  new_status text DEFAULT NULL,
  new_allowed_tabs text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  allowed_tabs text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only an administrator can manage users'; END IF;
  IF new_status IS NOT NULL AND new_status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'Invalid user status'; END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'Use administrator transfer to change administrator access'; END IF;

  UPDATE public.user_profiles p
  SET status = coalesce(new_status, p.status),
      allowed_tabs = CASE WHEN new_allowed_tabs IS NULL THEN p.allowed_tabs ELSE ARRAY(
        SELECT DISTINCT x FROM unnest(new_allowed_tabs) AS x
        WHERE x = ANY(ARRAY['dashboard','employees','attendance','salary','recruitment']::text[])
      ) END
  WHERE p.id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, r.role::text, p.status, p.allowed_tabs, p.created_at, p.updated_at
  FROM public.user_profiles p JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_admin(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  allowed_tabs text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only the current administrator can transfer administrator rights'; END IF;
  IF target_user_id = auth.uid() THEN RAISE EXCEPTION 'You are already the administrator'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = target_user_id AND p.status = 'approved') THEN
    RAISE EXCEPTION 'The new administrator must be an approved user';
  END IF;

  UPDATE public.user_roles SET role = 'user' WHERE role = 'admin';
  UPDATE public.user_profiles SET allowed_tabs = array_remove(allowed_tabs, 'user_control') WHERE id = auth.uid();
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = target_user_id;
  UPDATE public.user_profiles SET status = 'approved', allowed_tabs = ARRAY['dashboard','employees','attendance','salary','recruitment','user_control']::text[] WHERE id = target_user_id;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, r.role::text, p.status, p.allowed_tabs, p.created_at, p.updated_at
  FROM public.user_profiles p JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.id = target_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.transfer_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_user_profile_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER user_profiles_touch_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_user_profile_updated_at();

DO $$
DECLARE
  account record;
  account_number integer := 0;
BEGIN
  FOR account IN
    SELECT id, coalesce(email, '') AS email,
      coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), nullif(trim(raw_user_meta_data ->> 'name'), '')) AS full_name
    FROM auth.users ORDER BY created_at, id
  LOOP
    account_number := account_number + 1;
    INSERT INTO public.user_profiles (id, email, full_name, status, allowed_tabs)
    VALUES (
      account.id, account.email, account.full_name,
      CASE WHEN account_number = 1 THEN 'approved' ELSE 'pending' END,
      CASE WHEN account_number = 1 THEN ARRAY['dashboard','employees','attendance','salary','recruitment','user_control']::text[] ELSE ARRAY['dashboard']::text[] END
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (account.id, CASE WHEN account_number = 1 THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Signed-in staff manage employees" ON public.employees;
CREATE POLICY "Approved staff manage employees" ON public.employees FOR ALL TO authenticated
USING (public.is_approved()) WITH CHECK (public.is_approved());

DROP POLICY IF EXISTS "Signed-in staff manage attendance" ON public.attendance;
CREATE POLICY "Approved staff manage attendance" ON public.attendance FOR ALL TO authenticated
USING (public.is_approved()) WITH CHECK (public.is_approved());

DROP POLICY IF EXISTS "Signed-in staff manage documents" ON public.employee_documents;
CREATE POLICY "Approved staff manage documents" ON public.employee_documents FOR ALL TO authenticated
USING (public.is_approved()) WITH CHECK (public.is_approved());