-- =============================================================================
-- Migration v19 — Add a general "leave" (إجازة) attendance exception type.
--
-- Unlike the other exception types (which are recorded for a single day),
-- "leave" is meant to cover a date range: the app inserts one row per day
-- in the chosen range, all with type = 'leave'.
--
-- Run this once in the Supabase SQL editor (safe to re-run).
-- =============================================================================

alter table public.attendance_exceptions
  drop constraint if exists attendance_exceptions_type_check;

alter table public.attendance_exceptions
  add constraint attendance_exceptions_type_check
  check (type in ('absent', 'sick_leave', 'emergency_leave', 'permission', 'leave'));

-- =============================================================================
-- Done.
-- =============================================================================
