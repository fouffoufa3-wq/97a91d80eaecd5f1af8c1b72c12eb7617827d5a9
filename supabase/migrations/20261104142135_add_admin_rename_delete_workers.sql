/*
# Add admin ability to rename and delete workers

## Overview
1. Admins can now rename any worker (update full_name on profiles for any user).
2. Admins can delete a worker entirely (removing their auth.users entry, which cascades to profiles, work_entries, and payments).

## Changes
### profiles RLS
- New UPDATE policy: `update_profiles_admin` — allows admin to UPDATE any profile row.
- Existing `update_own_profile` remains so users can still update their own name.

### SECURITY DEFINER function
- `delete_worker(target_uid)`: admin-only. Deletes the target user from `auth.users`, which cascades to `profiles`, `work_entries`, and `payments` via ON DELETE CASCADE.
  - Prevents admin from deleting themselves.
  - Checks that target is a worker (not another admin) to avoid accidental admin removal.

## Security
- The rename is done via a new UPDATE policy so the admin client can update full_name directly.
- The delete is done via a SECURITY DEFINER function because deleting from auth.users requires service-role privileges (not available to the client).
- `delete_worker` revokes PUBLIC/anon execute, grants only authenticated.
*/
-- ============ Admin can update any profile (for renaming) ============

DROP POLICY IF EXISTS "update_profiles_admin" ON public.profiles;
CREATE POLICY "update_profiles_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant UPDATE on full_name to authenticated (already granted, but ensure column scope)
-- The existing GRANT UPDATE (full_name) ON profiles TO authenticated covers this.

-- ============ Delete worker function (SECURITY DEFINER) ============

CREATE OR REPLACE FUNCTION public.delete_worker(target_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete workers';
  END IF;
  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  SELECT role INTO target_role FROM public.profiles WHERE id = target_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF target_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete an admin account. Demote to worker first.';
  END IF;
  -- Delete from auth.users; cascades to profiles, work_entries, payments
  DELETE FROM auth.users WHERE id = target_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_worker(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_worker(uuid) TO authenticated;
