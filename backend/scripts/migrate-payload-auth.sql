-- Payload 3.90 adds this field to local auth collections.
-- Additive and idempotent: existing accounts and passwords are preserved.
BEGIN;
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reset_password_requested_at timestamp(3) with time zone;
COMMIT;
