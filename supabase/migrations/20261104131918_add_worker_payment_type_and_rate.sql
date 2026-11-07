/*
# Add per-worker payment type and custom rate

## Overview
Extends the profiles table so the admin can assign each worker a payment type
('hourly' or 'monthly') and a custom rate specific to that worker.

## Changes to existing tables
### profiles
- `payment_type` (text, NOT NULL, default 'hourly') — 'hourly' or 'monthly'
- `custom_rate` (numeric, nullable) — worker-specific rate. If NULL, falls back to app_settings.hourly_rate for hourly workers. For monthly workers, this is their monthly salary.

## Security
- The new columns are admin-controlled. Workers get SELECT on them (read-only).
- The existing UPDATE (full_name) grant stays — workers still cannot update these columns.
- A new SECURITY DEFINER function `set_worker_payment(uid, type, rate)` lets the admin set payment type and rate safely.
*/

-- Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'hourly' CHECK (payment_type IN ('hourly', 'monthly'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_rate numeric;

-- Admin-only function to set a worker's payment type and custom rate
CREATE OR REPLACE FUNCTION public.set_worker_payment(target_uid uuid, new_type text, new_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change payment settings';
  END IF;
  IF new_type NOT IN ('hourly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid payment type. Must be hourly or monthly.';
  END IF;
  UPDATE public.profiles
  SET payment_type = new_type,
      custom_rate = new_rate
  WHERE id = target_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_worker_payment(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_worker_payment(uuid, text, numeric) TO authenticated;
