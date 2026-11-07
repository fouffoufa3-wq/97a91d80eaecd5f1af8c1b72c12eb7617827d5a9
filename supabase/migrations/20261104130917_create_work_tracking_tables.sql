/*
# Work Tracking Schema — Tables Only

Creates three tables before functions/policies are added in the next migration.

## Tables
- profiles: user info + role (admin/worker)
- work_entries: daily work logs (check-in, check-out, break, net minutes)
- app_settings: singleton with hourly_rate
*/
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  check_in time NOT NULL,
  check_out time NOT NULL,
  break_mins integer NOT NULL DEFAULT 0,
  net_minutes integer NOT NULL,
  is_night_shift boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_entries_user_id ON public.work_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_date ON public.work_entries(entry_date);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hourly_rate numeric NOT NULL DEFAULT 250,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, hourly_rate)
VALUES (1, 250)
ON CONFLICT (id) DO NOTHING;
