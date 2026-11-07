/*
# Add worker approval system

## Overview
New workers must be approved by an admin before they can access the app.
The first user (admin) is auto-approved. All subsequent signups start as 'pending' and must be approved.

## Changes to existing tables
### profiles
- `approved` (boolean, NOT NULL, default false) — whether the admin has approved this user

## Functions
- `approve_user(target_uid)`: SECURITY DEFINER — admin-only, sets approved=true for a given user

## Security
- approve_user is admin-only (checks is_admin())
- Existing SELECT/UPDATE policies on profiles are unchanged
- The new column is admin-controlled; workers get SELECT on it via existing grant
*/
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- First user (existing admin) should be approved
UPDATE public.profiles SET approved = true WHERE role = 'admin';

CREATE OR REPLACE FUNCTION public.approve_user(target_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;
  UPDATE public.profiles SET approved = true WHERE id = target_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_user(uuid) TO authenticated;
