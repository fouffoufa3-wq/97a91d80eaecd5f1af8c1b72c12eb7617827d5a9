/*
# Link work entries to worker profiles

1. What changed
- Adds a foreign key from `work_entries.user_id` to `profiles.id`.
- This lets the app load each entry together with its worker's name and pay details in one request.

2. Modified tables
- `work_entries`: new constraint `work_entries_user_id_profiles_fkey`, cascades deletes when a profile is removed.

3. Security
- No policy, grant, or data changes. Existing row-level security rules still apply.

4. Notes
- Every existing entry already has a matching profile (checked before applying), so no rows are rejected.
- The constraint is added only if it does not already exist, so the migration is safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_entries_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.work_entries
      ADD CONSTRAINT work_entries_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
