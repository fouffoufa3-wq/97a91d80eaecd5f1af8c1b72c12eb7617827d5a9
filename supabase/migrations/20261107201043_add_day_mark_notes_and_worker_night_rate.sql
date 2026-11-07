/*
# Day mark notes and per-worker night rate

## What changed
- Day marks (absence, half day, night shift) can now carry a short note written by the worker.
- Admins can set the night shift amount for each monthly worker through a dedicated function.

## Modified tables
- `worker_day_marks`: new column `note` (text, empty by default).

## Security
- The new function `set_worker_night_rate` is restricted to admins. It is not callable by anonymous users.
- Existing row level security on `worker_day_marks` is unchanged.

## Notes
- Adding a column with a default does not change existing rows.
- The statements are safe to run again.
*/

ALTER TABLE public.worker_day_marks ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.set_worker_night_rate(target_uid uuid, new_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF new_rate IS NOT NULL AND new_rate < 0 THEN
    RAISE EXCEPTION 'Le montant de la prime de nuit ne peut pas être négatif';
  END IF;
  UPDATE public.profiles SET night_rate = new_rate WHERE id = target_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_worker_night_rate(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_worker_night_rate(uuid, numeric) TO authenticated;
