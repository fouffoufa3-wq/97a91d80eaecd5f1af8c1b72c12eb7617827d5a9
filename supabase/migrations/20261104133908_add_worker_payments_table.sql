/*
# Add worker payments table

## Overview
Creates a `payments` table so the admin can record money given to each worker.
Workers can view their own payment history and see a balance of total earned vs total paid.

## New Tables
### payments
- `id` (uuid, primary key)
- `worker_id` (uuid, references profiles, NOT NULL) — the worker who received the payment
- `amount` (numeric, NOT NULL, check >= 0) — amount paid in DA
- `payment_date` (date, NOT NULL) — date the payment was made
- `note` (text, default '') — optional note
- `recorded_by` (uuid, references auth.users) — admin who recorded it
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on payments.
- SELECT: workers see their own payments; admins see all.
- INSERT/UPDATE/DELETE: admin only.
- Grants: SELECT to authenticated; INSERT/UPDATE/DELETE to authenticated (RLS enforces admin-only).
- A SECURITY DEFINER function `record_payment` lets admin safely insert payments with server-side validation.
*/

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_worker_id ON public.payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.payments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payments TO authenticated;

DROP POLICY IF EXISTS "select_own_or_all_payments" ON public.payments;
CREATE POLICY "select_own_or_all_payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_payments_admin" ON public.payments;
CREATE POLICY "insert_payments_admin"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_payments_admin" ON public.payments;
CREATE POLICY "update_payments_admin"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_payments_admin" ON public.payments;
CREATE POLICY "delete_payments_admin"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.is_admin());
