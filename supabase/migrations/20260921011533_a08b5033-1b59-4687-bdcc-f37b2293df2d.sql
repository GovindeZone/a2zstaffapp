CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS TABLE(id uuid, email text, full_name text, role text, status text, allowed_tabs text[], created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin'
  ) INTO first_admin;

  jwt_email := coalesce(auth.jwt() ->> 'email', '');
  jwt_name := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), '')
  );

  INSERT INTO public.user_profiles AS up (id, email, full_name, status, allowed_tabs)
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
  ON CONFLICT ON CONSTRAINT user_profiles_pkey DO UPDATE SET
    email = CASE WHEN excluded.email <> '' THEN excluded.email ELSE up.email END,
    full_name = coalesce(excluded.full_name, up.full_name);

  INSERT INTO public.user_roles AS ur (user_id, role)
  VALUES (
    current_user_id,
    CASE WHEN first_admin THEN 'admin'::public.app_role ELSE 'user'::public.app_role END
  )
  ON CONFLICT ON CONSTRAINT user_roles_user_id_key DO NOTHING;

  RETURN QUERY
  SELECT up.id, up.email, up.full_name, ur.role::text, up.status,
         up.allowed_tabs, up.created_at, up.updated_at
  FROM public.user_profiles AS up
  JOIN public.user_roles AS ur ON ur.user_id = up.id
  WHERE up.id = current_user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO service_role;