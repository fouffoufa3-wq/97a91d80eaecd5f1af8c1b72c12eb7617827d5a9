/*
# Monthly pay rules: day marks, night rate and pay suspension

## What changed
Monthly-salary workers no longer log hours. Instead they mark absence days (full or half day) and night shifts. Each worker can also have a night rate (a fixed amount per night) and a period during which pay is suspended.

## New columns on profiles
- `night_rate` (numeric, nullable): amount paid per night shift. Empty means no special night rate.
- `pay_suspended_from` (date, nullable): first day of a period with no pay.
- `pay_suspended_to` (date, nullable): last day of that period.

## New table: worker_day_marks
- One row per worker per calendar day.
- `kind` is one of: `absence_full`, `absence_half`, `night`.

## Security
- Row level security is enabled on `worker_day_marks`.
- A worker can read, add, change and remove only their own marks. Admins can do the same for every worker.
- Grants are given only to the `authenticated` role, since the app requires sign-in.

## Notes
- Adding columns and tables does not remove or change any existing data.
- The statements are safe to run again.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS night_rate numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pay_suspended_from date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pay_suspended_to date;

CREATE TABLE IF NOT EXISTS public.worker_day_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mark_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('absence_full', 'absence_half', 'night')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, mark_date)
);

CREATE INDEX IF NOT EXISTS idx_worker_day_marks_worker_id ON public.worker_day_marks(worker_id);

ALTER TABLE public.worker_day_marks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_day_marks TO authenticated;

DROP POLICY IF EXISTS "select_day_marks" ON public.worker_day_marks;
CREATE POLICY "select_day_marks" ON public.worker_day_marks FOR SELECT
  TO authenticated USING (auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_day_marks" ON public.worker_day_marks;
CREATE POLICY "insert_day_marks" ON public.worker_day_marks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "update_day_marks" ON public.worker_day_marks;
CREATE POLICY "update_day_marks" ON public.worker_day_marks FOR UPDATE
  TO authenticated USING (auth.uid() = worker_id OR public.is_admin())
  WITH CHECK (auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_day_marks" ON public.worker_day_marks;
CREATE POLICY "delete_day_marks" ON public.worker_day_marks FOR DELETE
  TO authenticated USING (auth.uid() = worker_id OR public.is_admin());
