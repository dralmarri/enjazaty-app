-- =============================================================================
-- Enjazaty — Migration v11 — Lock approved achievements
--
-- Problem fixed: once an achievement is approved (supervisor/admin has signed
-- off on it), the owner (or even a supervisor) could still edit its title,
-- move it between folders, or delete it entirely — erasing an official record.
--
-- Fix: once status = 'approved', the row can no longer be updated or deleted
-- by anyone. Approving itself still works because at the moment the UPDATE
-- runs the row's *current* status is still 'submitted' (the row becomes
-- 'approved' only after this statement succeeds). Run AFTER migration_v7.
-- Idempotent.
-- =============================================================================

drop policy if exists "achievements_update" on public.achievements;
create policy "achievements_update" on public.achievements
  for update to authenticated
  using (
    status <> 'approved'
    and (owner_id = auth.uid() or public.is_supervisor_of(owner_id))
  );

drop policy if exists "achievements_delete" on public.achievements;
create policy "achievements_delete" on public.achievements
  for delete to authenticated
  using (
    status <> 'approved'
    and (owner_id = auth.uid() or public.is_supervisor_of(owner_id))
  );
