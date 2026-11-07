/*
# Work Tracking Schema — Functions, RLS, Policies, Triggers

## Functions
- is_admin(): SECURITY DEFINER — returns true if current user has admin role
- set_user_role(): SECURITY DEFINER — admin-only role change
- handle_new_user(): trigger function — auto-creates profile on signup; first user becomes admin

## RLS + Policies
### profiles
- SELECT: own row OR admin; UPDATE: own full_name only (column-restricted grant)
### work_entries
- SELECT/INSERT: own; UPDATE/DELETE: own or admin
### app_settings
- SELECT: any authenticated; UPDATE: admin only

## Trigger
- on_auth_user_created: AFTER INSERT on auth.users → handle_new_user()
*/

-- ============ Functions ============

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_user_role(target_uid uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  IF new_role NOT IN ('admin', 'worker') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or worker.';
  END IF;
  UPDATE public.profiles SET role = new_role WHERE id = target_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'admin');
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'worker');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- ============ Enable RLS ============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============ Grants ============

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

GRANT SELECT, INSERT, DELETE, UPDATE ON public.work_entries TO authenticated;

GRANT SELECT ON public.app_settings TO authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;

-- ============ profiles policies ============

DROP POLICY IF EXISTS "select_own_or_all_profiles" ON public.profiles;
CREATE POLICY "select_own_or_all_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============ work_entries policies ============

DROP POLICY IF EXISTS "select_own_or_all_entries" ON public.work_entries;
CREATE POLICY "select_own_or_all_entries"
  ON public.work_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_entries" ON public.work_entries;
CREATE POLICY "insert_own_entries"
  ON public.work_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_entries_admin_or_own" ON public.work_entries;
CREATE POLICY "update_entries_admin_or_own"
  ON public.work_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_or_all_entries" ON public.work_entries;
CREATE POLICY "delete_own_or_all_entries"
  ON public.work_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ============ app_settings policies ============

DROP POLICY IF EXISTS "select_settings_authenticated" ON public.app_settings;
CREATE POLICY "select_settings_authenticated"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "update_settings_admin" ON public.app_settings;
CREATE POLICY "update_settings_admin"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============ Trigger ============

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
