-- =============================================================================
-- Enjazaty — Migration v10 — Only admins may add a subordinate
--
-- Previously ANY user (admin or employee) could add a subordinate by User ID
-- (see migration_v2.sql comment "A supervisor (any user) adds a subordinate").
-- Business rule change: employees can no longer add other employees — only
-- admins can. Existing supervision links are untouched; this only restricts
-- creating NEW ones. Run AFTER migration_v9. Idempotent.
-- =============================================================================

drop policy if exists "supervisions_insert" on public.supervisions;
create policy "supervisions_insert" on public.supervisions
  for insert to authenticated with check (supervisor_id = auth.uid() and public.is_admin());

-- =============================================================================
-- Done.
-- =============================================================================
