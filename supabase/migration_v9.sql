-- =============================================================================
-- Enjazaty — Migration v9 — Add "employer" (جهة العمل) profile field
--
-- New free-text field distinct from `administration` (الإدارة التابع لها):
-- employer = the organisation/school the user belongs to; administration =
-- the department/unit inside it. Nullable, filled from the profile forms.
-- Run AFTER migration_v8. Idempotent.
-- =============================================================================

alter table public.users_profile
  add column if not exists employer text;

-- =============================================================================
-- Done.
-- =============================================================================
