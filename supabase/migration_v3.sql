-- =============================================================================
-- Enjazaty — Migration v3
-- Lets a supervisor read (browse) a subordinate's FOLDERS so they can open the
-- subordinate's folders/files and evaluate them. (Achievements + attachments
-- were already opened to supervisors in migration_v2.)
-- Run AFTER migration_v2.sql.
-- =============================================================================

drop policy if exists "folders_select" on public.folders;
create policy "folders_select" on public.folders
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin() or public.is_supervisor_of(owner_id));

-- =============================================================================
-- Done.
-- =============================================================================
